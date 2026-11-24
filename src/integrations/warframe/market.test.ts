import { afterEach, describe, expect, it, vi } from "vitest";
import { matchMarketItem, retryDelay } from "./market-mapping";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("market lookup", () => {
	it("uses official IDs and slugs for exact names and refuses ambiguous entries", () => {
		const entry = {
			id: "real-id",
			slug: "published_slug",
			name: "Example Prime Chassis",
		};
		expect(
			matchMarketItem(
				[entry],
				["Example Prime Chassis Blueprint", "example prime chassis"],
			),
		).toBe(entry);
		expect(matchMarketItem([entry], ["Example Prime"])).toBeUndefined();
		expect(
			matchMarketItem([entry, { ...entry, id: "other" }], [entry.name]),
		).toBeUndefined();
	});
	it("prefers a unique published game reference when names have changed", () => {
		const entry = {
			id: "part",
			slug: "published_slug",
			name: "Renamed item",
			gameRef: "/Lotus/Part",
		};
		expect(matchMarketItem([entry], ["Old name"], "/Lotus/Part")).toBe(entry);
	});

	it("honors Retry-After seconds and HTTP dates", () => {
		expect(retryDelay("2")).toBe(2000);
		expect(retryDelay("Thu, 01 Jan 1970 00:01:00 GMT", 0)).toBe(60000);
		expect(retryDelay(null)).toBe(60000);
	});
	it("fails closed without Redis outside explicit local development mode", async () => {
		vi.stubEnv("REDIS_URL", "");
		vi.stubEnv("MARKET_COORDINATION", "");
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const { getMappedPrice } = await import("./market.server");
		expect(await getMappedPrice(["Example Prime Set"])).toEqual({
			status: "unavailable",
		});
		expect(fetch).not.toHaveBeenCalled();
	});
	it("deduplicates matching requests and preserves an expired price on temporary upstream failure", async () => {
		vi.stubEnv("REDIS_URL", "");
		vi.stubEnv("MARKET_COORDINATION", "local");
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					data: [
						{
							id: "i",
							slug: "official_slug",
							i18n: { en: { name: "Example Prime Set" } },
						},
					],
				}),
			)
			.mockResolvedValueOnce(
				Response.json({ data: { sell: [{ platinum: 42 }] } }),
			)
			.mockResolvedValue(new Response(null, { status: 503 }));
		vi.stubGlobal("fetch", fetch);
		const { getMappedPrice } = await import("./market.server");
		const quote = () => getMappedPrice(["Example Prime Set"]);
		const [a, b] = await Promise.all([quote(), quote()]);
		expect(a).toEqual(b);
		expect(a).toMatchObject({ status: "fresh", quote: { platinum: 42 } });
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch.mock.calls[1][0]).toContain("/official_slug/top");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 121000);
		expect(await quote()).toMatchObject({
			status: "stale",
			quote: { platinum: 42 },
		});
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
		expect(await quote()).toMatchObject({
			status: "stale",
			quote: { platinum: 42 },
		});
	});
	it("caches a confirmed missing listing and distinguishes non-tradable parts", async () => {
		vi.stubEnv("REDIS_URL", "");
		vi.stubEnv("MARKET_COORDINATION", "local");
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					data: [
						{
							id: "i",
							slug: "official_slug",
							i18n: { en: { name: "Example Prime Set" } },
						},
					],
				}),
			)
			.mockResolvedValue(new Response(null, { status: 404 }));
		vi.stubGlobal("fetch", fetch);
		const { getMappedPrice } = await import("./market.server");
		expect(await getMappedPrice(["Example Prime Set"], false)).toEqual({
			status: "non-tradable",
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(await getMappedPrice(["Example Prime Set"])).toEqual({
			status: "missing",
		});
		expect(await getMappedPrice(["Example Prime Set"])).toEqual({
			status: "missing",
		});
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
