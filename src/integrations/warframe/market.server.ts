import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import type { MarketQuote } from "#/features/catalog/models";
import { createSnapshot, getRedis, releaseLease } from "./cache.server";
import { matchMarketItem, retryDelay } from "./market-mapping";

const prefix = "orbital-field-desk:v2:market";
const orders = z.object({
	data: z.object({
		sell: z.array(
			z.object({
				platinum: z.number().int().positive(),
				perTrade: z.number().int().positive().nullish(),
			}),
		),
	}),
});
const manifest = z.object({
	data: z.array(
		z.object({
			id: z.string(),
			gameRef: z.string().nullish(),
			slug: z.string().regex(/^[a-z0-9_-]+$/),
			i18n: z
				.object({ en: z.object({ name: z.string() }).optional() })
				.optional(),
		}),
	),
});
const interval = 400;
const reserveScript = `
local cooldown = redis.call('PTTL', KEYS[1])
if cooldown > 0 then return cooldown end
if redis.call('SET', KEYS[2], '1', 'PX', ARGV[1], 'NX') then return 0 end
return math.max(1, redis.call('PTTL', KEYS[2]))
`;
const backoffScript = `
if redis.call('PTTL', KEYS[1]) < tonumber(ARGV[1]) then
  redis.call('SET', KEYS[1], '1', 'PX', ARGV[1])
end
`;
const admissionScript = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now)
if redis.call('ZCARD', KEYS[1]) >= 16 then return 0 end
redis.call('ZADD', KEYS[1], now + 7000, ARGV[1])
redis.call('PEXPIRE', KEYS[1], 7000)
return 1
`;
let active = 0;
let localNext = 0;
let localBackoff = 0;
const singleInstance = () =>
	process.env.NODE_ENV !== "production" &&
	process.env.MARKET_COORDINATION === "local";

async function upstream(path: string) {
	if (active >= 12) throw new Error("Market request capacity reached.");
	active++;
	const token = randomUUID();
	const queueKey = `${prefix}:admission`;
	let admitted = false;
	let redis: Awaited<ReturnType<typeof getRedis>>;
	try {
		redis = await getRedis();
		if (redis) {
			admitted =
				Number(await redis.eval(admissionScript, 1, queueKey, token)) === 1;
			if (!admitted) throw new Error("Shared market request capacity reached.");
		}
		if (!redis && !singleInstance())
			throw new Error("Shared market coordination unavailable.");
		const deadline = Date.now() + 1800;
		while (true) {
			let wait: number;
			if (redis)
				wait = Number(
					await redis.eval(
						reserveScript,
						2,
						`${prefix}:backoff`,
						`${prefix}:pace`,
						interval,
					),
				);
			else {
				wait = Math.max(0, localNext - Date.now(), localBackoff - Date.now());
				if (!wait) localNext = Date.now() + interval;
			}
			if (!wait) break;
			if (Date.now() + wait > deadline)
				throw new Error("Market request capacity reached.");
			await setTimeout(wait);
		}
		const response = await fetch(`https://api.warframe.market/v2/${path}`, {
			headers: {
				"User-Agent":
					"OrbitalFieldDesk/0.2 (+https://github.com/hsm-gustavo/warframe-optimizer)",
				Platform: "pc",
				Crossplay: "false",
				Language: "en",
			},
			signal: AbortSignal.timeout(3500),
		});
		if (
			response.status === 429 ||
			response.status === 509 ||
			(response.status === 503 && response.headers.has("Retry-After"))
		) {
			const delay = retryDelay(response.headers.get("Retry-After"));
			if (redis) await redis.eval(backoffScript, 1, `${prefix}:backoff`, delay);
			else localBackoff = Math.max(localBackoff, Date.now() + delay);
		}
		return response;
	} finally {
		if (admitted) await redis?.zrem(queueKey, token).catch(() => {});
		active--;
	}
}

const getManifest = createSnapshot(
	"market-catalog",
	async () => {
		const response = await upstream("items");
		if (!response.ok) throw new Error("Warframe.market catalog unavailable.");
		const { data } = manifest.parse(await response.json());
		const mapped = data.flatMap(({ id, slug, i18n, gameRef }) =>
			i18n?.en
				? [{ id, slug, name: i18n.en.name, gameRef: gameRef ?? undefined }]
				: [],
		);
		if (!mapped.length)
			throw new Error("Warframe.market catalog returned no English names.");
		return mapped;
	},
	86_400_000,
	30 * 86_400_000,
	true,
);

export type PriceResult =
	| { status: "fresh" | "stale"; quote: MarketQuote }
	| {
			status: "missing" | "unavailable" | "unmapped" | "non-tradable";
			quote?: undefined;
	  };
type Observation = {
	quote: MarketQuote | null;
	expires: number;
	retainUntil: number;
};
const localQuotes = new Map<string, Observation>();
const pending = new Map<string, Promise<PriceResult>>();

async function resolveQuote(slug: string): Promise<PriceResult> {
	const redis = await getRedis();
	const key = `${prefix}:pc:${slug}`;
	const lock = `${key}:lock`;
	let cached = localQuotes.get(slug);
	const read = async () => {
		try {
			const value = await redis?.get(key);
			if (value) cached = JSON.parse(value) as Observation;
		} catch {
			// A retained observation may still be available in this process.
		}
		if (cached && cached.retainUntil <= Date.now()) cached = undefined;
		return cached && cached.expires > Date.now();
	};
	const responseFor = (stale: boolean): PriceResult =>
		cached?.quote
			? { status: stale ? "stale" : "fresh", quote: cached.quote }
			: { status: !stale && cached ? "missing" : "unavailable" };

	if (await read()) return responseFor(false);
	const token = randomUUID();
	let acquired = false;
	try {
		if (redis)
			acquired = (await redis.set(lock, token, "PX", 7000, "NX")) === "OK";
		else if (singleInstance()) acquired = true;
		else return responseFor(true);
		if (!acquired) {
			if (cached?.quote) return responseFor(true);
			for (let attempt = 0; attempt < 8; attempt++) {
				await setTimeout(175);
				if (await read()) return responseFor(false);
			}
			return { status: "unavailable" };
		}
		if (await read()) return responseFor(false);
		const response = await upstream(
			`orders/item/${encodeURIComponent(slug)}/top`,
		);
		if (response.status !== 404 && !response.ok)
			throw new Error("Market lookup unavailable.");
		const data = response.ok
			? orders.parse(await response.json()).data.sell
			: [];
		const prices = data
			.filter((order) => (order.perTrade ?? 1) === 1)
			.map((order) => order.platinum);
		const now = Date.now();
		cached = {
			quote: prices.length
				? {
						platinum: Math.min(...prices),
						platform: "PC",
						observedAt: new Date(now).toISOString(),
					}
				: null,
			expires: now + (prices.length ? 120_000 : 300_000),
			retainUntil: now + (prices.length ? 86_400_000 : 300_000),
		};
		if (localQuotes.size >= 1500) {
			const oldest = localQuotes.keys().next().value;
			if (oldest) localQuotes.delete(oldest);
		}
		localQuotes.set(slug, cached);
		await redis?.set(
			key,
			JSON.stringify(cached),
			"PX",
			cached.retainUntil - now,
		);
		return responseFor(false);
	} catch {
		return responseFor(true);
	} finally {
		if (redis && acquired) await releaseLease(redis, lock, token);
	}
}

function refresh(slug: string) {
	const existing = pending.get(slug);
	if (existing) return existing;
	if (pending.size >= 20)
		return Promise.resolve<PriceResult>({ status: "unavailable" });
	const request = resolveQuote(slug).finally(() => pending.delete(slug));
	pending.set(slug, request);
	return request;
}

export async function getMappedPrice(
	candidates: readonly string[],
	tradable?: boolean,
	gameRef?: string,
): Promise<PriceResult> {
	if (tradable === false) return { status: "non-tradable" };
	const catalog = await getManifest();
	if (!catalog) return { status: "unavailable" };
	const item = matchMarketItem(catalog.data, candidates, gameRef);
	if (!item) return { status: "unmapped" };
	let cached = localQuotes.get(item.slug);
	if (!cached || cached.retainUntil <= Date.now()) {
		try {
			const shared = await (await getRedis())?.get(`${prefix}:pc:${item.slug}`);
			if (shared) cached = JSON.parse(shared) as Observation;
		} catch {
			// Quote refresh is still subject to the configured upstream budget.
		}
	}
	if (
		cached?.quote &&
		cached.expires <= Date.now() &&
		cached.retainUntil > Date.now()
	) {
		void refresh(item.slug);
		return { status: "stale", quote: cached.quote };
	}
	return refresh(item.slug);
}
