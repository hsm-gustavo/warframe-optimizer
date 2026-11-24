import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rewardName } from "#/features/catalog/models";
import {
	getRelicIndex,
	getRelicRecords,
} from "#/integrations/warframe/drops.server";
import { getCatalog } from "#/integrations/warframe/equipment.server";

export const loadRelics = createServerFn()
	.validator(
		z.object({
			q: z.string().max(120).optional(),
			era: z.string().max(30).optional(),
			page: z.number().int().min(1).max(10000).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { records, ...status } = await getRelicIndex();
		const query = data.q?.trim().toLowerCase() ?? "";
		const results = records.filter(
			(relic) =>
				(!data.era || data.era === relic.era) &&
				(relic.name.toLowerCase().includes(query) ||
					relic.rewards.some((reward) =>
						reward.name.toLowerCase().includes(query),
					)),
		);
		const pages = Math.max(1, Math.ceil(results.length / 30));
		const page = Math.min(data.page ?? 1, pages);
		return {
			...status,
			total: results.length,
			page,
			pages,
			eras: [...new Set(records.map((record) => record.era))],
			items: results
				.slice((page - 1) * 30, page * 30)
				.map(({ id, name, era, rewards }) => ({
					id,
					name,
					era,
					matches: query
						? rewards
								.filter((reward) => reward.name.toLowerCase().includes(query))
								.map((reward) => reward.name)
						: [],
				})),
		};
	});

export const loadRelic = createServerFn()
	.validator(z.string().max(128))
	.handler(async ({ data }) => {
		const [{ records, ...status }, { items }] = await Promise.all([
			getRelicRecords(),
			getCatalog(),
		]);
		const relic = records.find((record) => record.id === data);
		if (!relic) return { relic: null, ...status };
		const rewards = relic.rewards.map((reward) => {
			for (const item of items) {
				const part = item.components.find(
					(entry) => rewardName(item, entry) === reward.name,
				);
				if (part)
					return { ...reward, equipment: item.slug, ducats: part.ducats };
			}
			return { ...reward, equipment: undefined, ducats: undefined };
		});
		return { relic: { ...relic, rewards }, ...status };
	});

export const loadRelicFeedStatus = createServerFn().handler(async () => {
	const { observedAt, stale } = await getRelicIndex();
	return { observedAt, stale };
});
