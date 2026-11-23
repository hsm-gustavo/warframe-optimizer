import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import type { MarketQuote } from "#/features/catalog/models";
import { createTimedLookup } from "./cache.server";

const orders = z.object({
	data: z.object({
		sell: z.array(
			z.object({
				platinum: z.number().int().positive(),
				perTrade: z.number().int().positive().optional(),
			}),
		),
	}),
});

let queue: Promise<unknown> = Promise.resolve();
let nextRequestAt = 0;
let backedOffUntil = 0;

export const getMarketQuote = createTimedLookup(
	"market:pc",
	async (slug: string): Promise<MarketQuote | undefined> => {
		const request = queue.then(async () => {
			if (Date.now() < backedOffUntil)
				throw new Error("Warframe.market is rate limiting requests.");
			await setTimeout(Math.max(0, nextRequestAt - Date.now()));
			nextRequestAt = Date.now() + 400;
			const response = await fetch(
				`https://api.warframe.market/v2/orders/item/${encodeURIComponent(slug)}/top`,
				{
					headers: {
						"User-Agent": "OrbitalFieldDesk/0.1",
						Platform: "pc",
						Crossplay: "false",
					},
					signal: AbortSignal.timeout(3500),
				},
			);
			if (response.status === 429 || response.status === 509) {
				backedOffUntil = Date.now() + 60_000;
			}
			if (!response.ok)
				throw new Error(`Warframe.market returned ${response.status}`);
			const { data } = orders.parse(await response.json());
			const prices = data.sell
				.filter((order) => (order.perTrade ?? 1) === 1)
				.map((order) => order.platinum);
			return prices.length
				? {
						platinum: Math.min(...prices),
						observedAt: new Date().toISOString(),
						platform: "PC",
					}
				: undefined;
		});
		queue = request.catch(() => undefined);
		return request;
	},
	120_000,
	60_000,
);
