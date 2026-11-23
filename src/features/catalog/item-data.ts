import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findItem } from "./catalog";

export const loadEquipmentRecord = createServerFn()
	.validator(z.string().max(128))
	.handler(async ({ data: slug }) => {
		const item = findItem(slug);
		if (!item) return null;

		const [{ withLiveDrops }, { getMarketQuote }] = await Promise.all([
			import("#/integrations/warframe/drops.server"),
			import("#/integrations/warframe/market.server"),
		]);
		const [record, market] = await Promise.all([
			withLiveDrops(item),
			getMarketQuote(`${slug.replaceAll("-", "_")}_set`),
		]);
		return { ...record, market: market ?? undefined };
	});

export const loadComponentQuotes = createServerFn()
	.validator(z.string().max(128))
	.handler(async ({ data: slug }) => {
		const item = findItem(slug);
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
