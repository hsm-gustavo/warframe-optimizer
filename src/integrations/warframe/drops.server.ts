import { z } from "zod";
import type {
	CatalogItem,
	DropRarity,
	DropSource,
	Refinement,
} from "#/features/catalog/models";
import { refinements } from "#/features/catalog/models";
import { createTimedLookup } from "./cache.server";

const reward = z.object({
	itemName: z.string(),
	chance: z.number().min(0).max(100),
});
const refinementsSchema = z.enum(refinements);
const relicFeed = z.object({
	relics: z.array(
		z.object({
			tier: z.string(),
			relicName: z.string().optional(),
			state: z.string(),
			rewards: z.array(reward),
		}),
	),
});
const rewardPool = z.array(reward);
const missionFeed = z.object({
	missionRewards: z.record(
		z.string(),
		z.record(
			z.string(),
			z.object({
				isEvent: z.boolean().optional(),
				rewards: z.union([rewardPool, z.record(z.string(), rewardPool)]),
			}),
		),
	),
});

async function getFeed<T>(file: string, schema: z.ZodType<T>): Promise<T> {
	const response = await fetch(
		`https://drops.warframestat.us/data/${file}.json`,
		{ signal: AbortSignal.timeout(3500) },
	);
	if (!response.ok) throw new Error(`WFCD returned ${response.status}`);
	return schema.parse(await response.json());
}

const getRelics = createTimedLookup(
	() => getFeed("relics", relicFeed),
	3_600_000,
	60_000,
);

type MissionDrop = { location: string; rotation?: string; probability: number };

const getMissions = createTimedLookup(
	async () => {
		const { missionRewards } = await getFeed("missionRewards", missionFeed);
		const missions = new Map<string, MissionDrop[]>();

		for (const [planet, nodes] of Object.entries(missionRewards)) {
			for (const [node, mission] of Object.entries(nodes)) {
				if (mission.isEvent) continue;
				const pools = Array.isArray(mission.rewards)
					? [["", mission.rewards] as const]
					: Object.entries(mission.rewards);
				for (const [rotation, rewards] of pools) {
					const seen = new Set<string>();
					for (const reward of rewards) {
						if (
							!reward.itemName.endsWith(" Relic") ||
							seen.has(reward.itemName)
						)
							continue;
						seen.add(reward.itemName);
						const drops = missions.get(reward.itemName) ?? [];
						drops.push({
							location: `${node}, ${planet}`,
							rotation: rotation || undefined,
							probability: reward.chance,
						});
						missions.set(reward.itemName, drops);
					}
				}
			}
		}
		for (const drops of missions.values())
			drops.sort((a, b) => b.probability - a.probability);
		return missions;
	},
	3_600_000,
	60_000,
);

// WFCD's rarity labels may differ from the published chance for individual rewards.
function rarityFromIntactChance(
	chance: number | undefined,
): DropRarity | undefined {
	if (chance === undefined) return undefined;
	if (chance >= 24 && chance <= 26) return "Common";
	if (chance === 11) return "Uncommon";
	if (chance === 2) return "Rare";
}

export async function withLiveDrops(item: CatalogItem): Promise<CatalogItem> {
	const [feed, missions] = await Promise.all([
		getRelics(undefined),
		getMissions(undefined),
	]);
	if (!feed) return item;

	const targets = new Map(
		item.components.map((part) => {
			const blueprint =
				item.category === "Warframe" && part.name !== "Blueprint"
					? " Blueprint"
					: "";
			return [
				`${item.name} ${part.name}${blueprint}`,
				new Map<string, Partial<Record<Refinement, number>>>(),
			];
		}),
	);

	for (const relic of feed.relics) {
		const state = refinementsSchema.safeParse(relic.state);
		if (!state.success || !relic.relicName) continue;
		const name = `${relic.tier} ${relic.relicName}`;
		for (const reward of relic.rewards) {
			const sources = targets.get(reward.itemName);
			if (!sources) continue;
			const chance = sources.get(name) ?? {};
			chance[state.data] = reward.chance;
			sources.set(name, chance);
		}
	}

	return {
		...item,
		dropData: "wfcd",
		components: item.components.map((part) => {
			const blueprint =
				item.category === "Warframe" && part.name !== "Blueprint"
					? " Blueprint"
					: "";
			const sources = targets.get(`${item.name} ${part.name}${blueprint}`);
			const relics: DropSource[] = Array.from(
				sources ?? [],
				([name, probabilities]) => ({
					kind: "relic",
					relic: { name, missionDrop: missions?.get(`${name} Relic`)?.[0] },
					probabilities,
					rarity: rarityFromIntactChance(probabilities.Intact),
				}),
			);
			return { ...part, sources: relics };
		}),
	};
}
