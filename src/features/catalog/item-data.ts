import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withLiveDrops } from "#/integrations/warframe/drops.server";
import { getCatalog } from "#/integrations/warframe/equipment.server";
import { getMappedPrice } from "#/integrations/warframe/market.server";
import { type CatalogItem, rewardName } from "./models";

function summarize({ slug, name, category, edition, artwork }: CatalogItem) {
	return { slug, name, category, edition, artwork };
}

export const loadCatalog = createServerFn().handler(async () => {
	const { items, ...status } = await getCatalog();
	return { items: items.map(summarize), ...status };
});

export const loadEquipmentRecord = createServerFn()
	.validator(z.string().max(128))
	.handler(async ({ data }) => {
		const { items, source } = await getCatalog();
		const item = items.find((entry) => entry.slug === data);
		return { item: item ? await withLiveDrops(item) : null, source };
	});

export const loadOptimizer = createServerFn()
	.validator(z.string().max(128).optional())
	.handler(async ({ data }) => {
		const { items, source } = await getCatalog();
		const item =
			items.find((entry) => entry.slug === (data ?? "burston-prime")) ??
			items[0];
		return {
			item: item ? await withLiveDrops(item) : null,
			items: items.map(summarize),
			source,
		};
	});

export const loadPrices = createServerFn()
	.validator(
		z.object({
			slug: z.string().max(128),
			parts: z.array(z.string().max(512)).max(12).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { items } = await getCatalog();
		const item = items.find((entry) => entry.slug === data.slug);
		if (!item) return [];
		if (!data.parts)
			return [
				{
					id: "set",
					name: "Set",
					result: await getMappedPrice([`${item.name} Set`]),
				},
			];
		const selected = new Set(data.parts);
		return Promise.all(
			item.components
				.filter((part) => {
					const id = part.id ?? `${item.slug}/${part.name.toLowerCase()}`;
					return selected.has(id);
				})
				.map(async (part) => ({
					id: part.id ?? `${item.slug}/${part.name.toLowerCase()}`,
					name: part.name,
					result: await getMappedPrice(
						[rewardName(item, part), `${item.name} ${part.name}`],
						part.tradable,
						part.id,
					),
				})),
		);
	});
