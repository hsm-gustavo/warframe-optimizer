import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCatalog } from "#/integrations/warframe/equipment.server";
import { fixtureItems } from "./fixtures";
import type { CatalogItem } from "./models";

function summarize({ slug, name, category, edition, artwork }: CatalogItem) {
	return { slug, name, category, edition, artwork };
}

export const loadCatalog = createServerFn().handler(async () => {
	const { items, source } = await getCatalog();
	return { items: items.map(summarize), source };
});

export const loadDesktopCatalog = createServerFn().handler(async () => {
	const { items, source } = await getCatalog();
	const featured = ["rhino-prime", "burston-prime", "lex-prime"].flatMap(
		(slug) => {
			const item = items.find((entry) => entry.slug === slug);
			return item ? [summarize(item)] : [];
		},
	);
	return { featured, count: items.length, source };
});

async function enrich(item: CatalogItem) {
	const [{ withLiveDrops }, { getMarketQuote }] = await Promise.all([
		import("#/integrations/warframe/drops.server"),
		import("#/integrations/warframe/market.server"),
	]);
	const [record, market] = await Promise.all([
		withLiveDrops(item),
		item.components.length
			? getMarketQuote(`${item.slug.replaceAll("-", "_")}_set`)
			: undefined,
	]);
	const sample =
		!record.dropData && fixtureItems.find((entry) => entry.slug === item.slug);
	return {
		...record,
		components: sample
			? record.components.map((part) => ({
					...part,
					sources:
						sample.components.find((entry) => entry.name === part.name)
							?.sources ?? part.sources,
				}))
			: record.components,
		market: market ?? undefined,
	};
}

export const loadEquipmentRecord = createServerFn()
	.validator(z.string().max(128))
	.handler(async ({ data: slug }) => {
		const { items, source } = await getCatalog();
		const item = items.find((entry) => entry.slug === slug);
		if (!item && source === "sample")
			throw new Error("The WFCD equipment catalog is unavailable.");
		return item ? enrich(item) : null;
	});

export const loadOptimizer = createServerFn()
	.validator(z.string().max(128).optional())
	.handler(async ({ data: slug }) => {
		const { items, source } = await getCatalog();
		const item =
			items.find((entry) => entry.slug === (slug ?? "burston-prime")) ??
			items[0];
		return {
			item: item ? await enrich(item) : null,
			items: items.map(summarize),
			source,
		};
	});

export const loadComponentQuotes = createServerFn()
	.validator(z.string().max(128))
	.handler(async ({ data: slug }) => {
		const { items } = await getCatalog();
		const item = items.find((entry) => entry.slug === slug);
		if (!item) return [];

		const { getMarketQuote } = await import(
			"#/integrations/warframe/market.server"
		);
		return Promise.all(
			item.components.map(async ({ name }) => ({
				name,
				quote:
					(await getMarketQuote(
						`${slug.replaceAll("-", "_")}_${name.toLowerCase().replaceAll(" ", "_")}`,
					)) ?? null,
			})),
		);
	});
