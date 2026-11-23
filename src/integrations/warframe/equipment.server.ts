import { z } from "zod";
import { fixtureItems } from "#/features/catalog/fixtures";
import type { CatalogItem, Category } from "#/features/catalog/models";
import { createTimedLookup } from "./cache.server";

const feeds = {
	Warframes: { category: "Warframe", artwork: "frame" },
	Primary: { category: "Primary", artwork: "rifle" },
	Secondary: { category: "Secondary", artwork: "sidearm" },
	Melee: { category: "Melee", artwork: "blade" },
	"Arch-Gun": { category: "Arch-Gun", artwork: "rifle" },
	Sentinels: { category: "Sentinel", artwork: "sentinel" },
	SentinelWeapons: { category: "Sentinel Weapon", artwork: "rifle" },
} as const satisfies Record<
	string,
	{ category: Category; artwork: CatalogItem["artwork"] }
>;

const equipment = z.array(
	z.object({
		name: z.string(),
		isPrime: z.boolean().optional(),
		components: z
			.array(
				z.object({
					uniqueName: z.string(),
					itemCount: z.number().int().positive(),
				}),
			)
			.optional(),
	}),
);
const components = z.array(
	z.object({ uniqueName: z.string(), name: z.string() }),
);

async function fetchEquipment<T>(file: string, schema: z.ZodType<T>) {
	const url = `https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/${file}.json`;
	const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
	if (!response.ok)
		throw new Error(`WFCD equipment returned ${response.status}`);
	return schema.parse(await response.json());
}

const getEquipment = createTimedLookup(
	"wfcd:prime-equipment",
	async () => {
		const [parts, groups] = await Promise.all([
			fetchEquipment("Components", components),
			Promise.all(
				Object.entries(feeds).map(async ([file, meta]) => ({
					meta,
					items: await fetchEquipment(file, equipment),
				})),
			),
		]);
		const partNames = new Map(
			parts.map((part) => [part.uniqueName, part.name]),
		);
		const records = new Map<string, CatalogItem>();
		for (const { meta, items } of groups) {
			for (const item of items) {
				if (!item.isPrime && !item.name.endsWith(" Prime")) continue;
				const slug = item.name
					.normalize("NFKD")
					.replace(/\p{Diacritic}/gu, "")
					.toLowerCase()
					.replace(/['’]/g, "")
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, "");
				const counts = new Map<string, number>();
				for (const ref of item.components ?? []) {
					const name = partNames.get(ref.uniqueName);
					if (name) counts.set(name, (counts.get(name) ?? 0) + ref.itemCount);
				}
				records.set(slug, {
					...meta,
					slug,
					name: item.name,
					edition: "Prime",
					components: Array.from(counts, ([name, quantity]) => ({
						name,
						quantity,
						sources: [],
					})),
				});
			}
		}
		if (!records.size)
			throw new Error("WFCD returned an empty Prime equipment index.");
		return [...records.values()].sort((a, b) =>
			a.name.localeCompare(b.name, "en"),
		);
	},
	3_600_000,
	60_000,
);

export async function getCatalog(): Promise<{
	source: "wfcd" | "sample";
	items: readonly CatalogItem[];
}> {
	const items = await getEquipment(undefined);
	return items
		? { source: "wfcd", items }
		: { source: "sample", items: fixtureItems };
}
