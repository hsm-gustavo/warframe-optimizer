import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { Redis } from "ioredis";

type CacheEntry<Value> = {
	value: Value | null;
	expiresAt: number;
};

let redis: Redis | undefined;
let connecting: Promise<void> | undefined;

async function getRedis() {
	const url = process.env.REDIS_URL;
	if (!url) return undefined;

	if (!redis) {
		redis = new Redis(url, {
			lazyConnect: true,
			enableOfflineQueue: false,
			enableReadyCheck: false,
			connectTimeout: 500,
			commandTimeout: 300,
			maxRetriesPerRequest: 0,
			retryStrategy: () => 5000,
		});
		let reportedUnavailable = false;
		redis.on("error", () => {
			if (reportedUnavailable) return;
			reportedUnavailable = true;
			console.warn("Shared Redis cache unavailable; using in-memory cache.");
		});
		redis.on("ready", () => {
			reportedUnavailable = false;
		});
		connecting = redis
			.connect()
			.catch(() => undefined)
			.finally(() => {
				connecting = undefined;
			});
	}
	await connecting;
	return redis.status === "ready" ? redis : undefined;
}

async function readShared<Value>(
	key: string,
): Promise<CacheEntry<Value> | undefined> {
	try {
		const data = await (await getRedis())?.get(key);
		if (!data) return undefined;
		const entry = JSON.parse(data) as CacheEntry<Value>;
		if (entry.expiresAt > Date.now() && "value" in entry) return entry;
	} catch {
		// The in-process cache and upstream loaders remain available.
	}
}

async function writeShared<Value>(key: string, entry: CacheEntry<Value>) {
	try {
		const client = await getRedis();
		const ttl = entry.expiresAt - Date.now();
		if (client && ttl > 0)
			await client.set(key, JSON.stringify(entry), "PX", ttl);
	} catch {
		// Local callers can still use the loaded value.
	}
}

export { getRedis };

export function createSnapshot<Value>(
	namespace: string,
	load: () => Promise<Value>,
	freshFor: number,
	retainFor: number,
	sharedRefresh = false,
) {
	const key = `orbital-field-desk:v2:snapshot:${namespace}`;
	let saved: CacheEntry<{ data: Value; observedAt: string }> | undefined;
	let pending: Promise<typeof saved> | undefined;
	let retryAt = 0;
	const fresh = () =>
		saved?.value && Date.now() - Date.parse(saved.value.observedAt) < freshFor;
	async function read() {
		if (saved?.expiresAt && saved.expiresAt <= Date.now()) saved = undefined;
		if (fresh()) return saved;
		const remote = await readShared<{ data: Value; observedAt: string }>(key);
		if (
			remote?.value &&
			(!saved?.value || remote.value.observedAt > saved.value.observedAt)
		)
			saved = remote;
		if (saved && saved.expiresAt <= Date.now()) saved = undefined;
		if (
			Date.now() < retryAt ||
			(saved?.value &&
				Date.now() - Date.parse(saved.value.observedAt) < freshFor)
		)
			return saved;
		const client = sharedRefresh ? await getRedis() : undefined;
		const lock = `${key}:lock`;
		const token = randomUUID();
		let held = false;
		try {
			if (client) {
				held = (await client.set(lock, token, "PX", 7000, "NX")) === "OK";
				if (!held) {
					if (saved) return saved;
					for (let retry = 0; retry < 8; retry++) {
						await setTimeout(175);
						const result = await readShared<{
							data: Value;
							observedAt: string;
						}>(key);
						if (result) {
							saved = result;
							return saved;
						}
					}
					return undefined;
				}
				const recent = await readShared<{ data: Value; observedAt: string }>(
					key,
				);
				if (
					recent?.value &&
					Date.now() - Date.parse(recent.value.observedAt) < freshFor
				) {
					saved = recent;
					return saved;
				}
			}
			saved = {
				value: { data: await load(), observedAt: new Date().toISOString() },
				expiresAt: Date.now() + retainFor,
			};
			await writeShared(key, saved);
		} catch {
			retryAt = Date.now() + 60_000;
		} finally {
			if (client && held) await releaseLease(client, lock, token);
		}
		return saved;
	}
	return async () => {
		if (!pending)
			pending = read().finally(() => {
				pending = undefined;
			});
		const entry = (await pending)?.value;
		return entry
			? {
					...entry,
					stale: Date.now() - Date.parse(entry.observedAt) >= freshFor,
				}
			: null;
	};
}

export async function releaseLease(client: Redis, key: string, token: string) {
	await client
		.eval(
			"if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
			1,
			key,
			token,
		)
		.catch(() => {});
}
