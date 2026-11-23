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

export function createTimedLookup<Key extends string | undefined, Value>(
	namespace: string,
	load: (key: Key) => Promise<Value>,
	freshFor: number,
	retryAfter: number,
) {
	const cached = new Map<Key, CacheEntry<Value>>();
	const pending = new Map<Key, Promise<Value | null>>();

	async function lookup(key: Key): Promise<Value | null> {
		const sharedKey = `orbital-field-desk:v1:${namespace}:${key ?? "feed"}`;
		const shared = await readShared<Value>(sharedKey);
		if (shared) {
			cached.set(key, shared);
			return shared.value;
		}

		let entry: CacheEntry<Value>;
		try {
			const value = (await load(key)) ?? null;
			entry = { value, expiresAt: Date.now() + freshFor };
		} catch {
			entry = { value: null, expiresAt: Date.now() + retryAfter };
			cached.set(key, entry);
			return entry.value;
		}

		cached.set(key, entry);
		await writeShared(sharedKey, entry);
		return entry.value;
	}

	return (key: Key): Promise<Value | null> => {
		const entry = cached.get(key);
		if (entry && entry.expiresAt > Date.now())
			return Promise.resolve(entry.value);

		const request = pending.get(key);
		if (request) return request;

		const next = lookup(key).finally(() => pending.delete(key));
		pending.set(key, next);
		return next;
	};
}
