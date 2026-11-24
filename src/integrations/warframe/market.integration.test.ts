import { afterAll, expect, it, vi } from "vitest";

const clients: NonNullable<
	Awaited<ReturnType<typeof import("./cache.server")["getRedis"]>>
>[] = [];
afterAll(() => {
	for (const client of clients) client.disconnect();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

it.skipIf(!process.env.ORBITAL_TEST_REDIS_URL)(
	"coordinates pacing, deduplication and backoff across independent server instances",
	async () => {
		vi.stubEnv("REDIS_URL", process.env.ORBITAL_TEST_REDIS_URL);
		const events: { path: string; at: number }[] = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				const path = new URL(url).pathname;
				events.push({ path, at: Date.now() });
				if (path === "/v2/items")
					return Response.json({
						data: ["Alpha", "Beta", "Gamma"].map((name) => ({
							id: name,
							slug: name.toLowerCase(),
							i18n: { en: { name } },
						})),
					});
				if (path.endsWith("/beta/top"))
					return new Response(null, {
						status: 429,
						headers: { "Retry-After": "3" },
					});
				return Response.json({ data: { sell: [{ platinum: 20 }] } });
			}),
		);
		async function instance() {
			vi.resetModules();
			const module = await import("./market.server");
			const client = await (await import("./cache.server")).getRedis();
			if (client) clients.push(client);
			return module.getMappedPrice;
		}
		const [a, b] = [await instance(), await instance()];
		expect(await Promise.all([a(["Alpha"]), b(["Alpha"])])).toEqual([
			expect.objectContaining({ status: "fresh" }),
			expect.objectContaining({ status: "fresh" }),
		]);
		expect(events.map((entry) => entry.path)).toEqual([
			"/v2/items",
			"/v2/orders/item/alpha/top",
		]);
		expect(events[1].at - events[0].at).toBeGreaterThanOrEqual(350);
		expect(await b(["Beta"])).toMatchObject({ status: "unavailable" });
		expect(events[2].at - events[1].at).toBeGreaterThanOrEqual(350);
		expect(await a(["Gamma"])).toMatchObject({ status: "unavailable" });
		expect(events).toHaveLength(3);
	},
);
