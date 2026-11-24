import { z } from "zod";
import { fixtureItems } from "#/features/catalog/fixtures";
import type { CatalogItem, Category } from "#/features/catalog/models";
import { createSnapshot } from "./cache.server";

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
		uniqueName: z.string().optional(),
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
	z.object({
		uniqueName: z.string(),
		name: z.string(),
		tradable: z.boolean().optional(),
		ducats: z.number().nonnegative().optional(),
	}),
);

async function fetchEquipment<T>(file: string, schema: z.ZodType<T>) {
	const url = `https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/${file}.json`;
	const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
	if (!response.ok)
		throw new Error(`WFCD equipment returned ${response.status}`);
	return schema.parse(await response.json());
}

const getEquipment = createSnapshot(
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
		const partNames = new Map(parts.map((part) => [part.uniqueName, part]));
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
					if (partNames.has(ref.uniqueName))
						counts.set(
							ref.uniqueName,
							(counts.get(ref.uniqueName) ?? 0) + ref.itemCount,
						);
				}
				records.set(slug, {
					...meta,
					slug,
					name: item.name,
					sourceId: item.uniqueName,
					edition: "Prime",
					components: Array.from(counts, ([id, quantity]) => ({
						id,
						name: partNames.get(id)?.name ?? id,
						tradable: partNames.get(id)?.tradable,
						ducats: partNames.get(id)?.ducats,
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
	30 * 86_400_000,
);

export async function getCatalog(): Promise<{
	source: "wfcd" | "stale" | "sample" | "unavailable";
	items: readonly CatalogItem[];
	observedAt?: string;
}> {
	const snapshot = await getEquipment();
	if (snapshot)
		return {
			source: snapshot.stale ? "stale" : "wfcd",
			items: snapshot.data,
			observedAt: snapshot.observedAt,
		};
	if (
		process.env.NODE_ENV !== "production" &&
		process.env.WARFRAME_FIXTURES === "1"
	) {
		return { source: "sample", items: fixtureItems };
	}
	return { source: "unavailable", items: [] };
}
