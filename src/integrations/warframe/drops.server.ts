import { z } from "zod";
import {
	type CatalogItem,
	type MissionDrop,
	type Refinement,
	type RelicRecord,
	refinements,
	rewardName,
} from "#/features/catalog/models";
import { createSnapshot } from "./cache.server";

const reward = z.object({
	itemName: z.string(),
	chance: z.number().min(0).max(100),
});
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
const missionFeed = z.object({
	missionRewards: z.record(
		z.string(),
		z.record(
			z.string(),
			z.object({
				isEvent: z.boolean().optional(),
				rewards: z.union([
					z.array(reward),
					z.record(z.string(), z.array(reward)),
				]),
			}),
		),
	),
});

async function getFeed<T>(file: string, schema: z.ZodType<T>) {
	const response = await fetch(
		`https://drops.warframestat.us/data/${file}.json`,
		{ signal: AbortSignal.timeout(5000) },
	);
	if (!response.ok) throw new Error(`WFCD returned ${response.status}`);
	return schema.parse(await response.json());
}

const getRewards = createSnapshot(
	"relic-rewards",
	async () => {
		const feed = await getFeed("relics", relicFeed);
		const records = new Map<
			string,
			{
				name: string;
				era: string;
				rewards: Map<string, Partial<Record<Refinement, number>>>;
			}
		>();
		for (const relic of feed.relics) {
			const state = refinements.find((entry) => entry === relic.state);
			if (!state || !relic.relicName) continue;
			const name = `${relic.tier} ${relic.relicName}`;
			const id = name.toLowerCase().replaceAll(" ", "-");
			const record = records.get(id) ?? {
				name,
				era: relic.tier,
				rewards: new Map(),
			};
			for (const reward of relic.rewards) {
				const probabilities = record.rewards.get(reward.itemName) ?? {};
				probabilities[state] = reward.chance;
				record.rewards.set(reward.itemName, probabilities);
			}
			records.set(id, record);
		}
		if (!records.size) throw new Error("WFCD returned an empty relic index.");
		return Array.from(records, ([id, { name, era, rewards }]) => ({
			id,
			name,
			era,
			rewards: Array.from(rewards, ([name, probabilities]) => ({
				name,
				probabilities,
			})),
		})).sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
	},
	3_600_000,
	30 * 86_400_000,
);

const getMissions = createSnapshot(
	"relic-missions-all",
	async () => {
		const { missionRewards } = await getFeed("missionRewards", missionFeed);
		const missions = new Map<string, MissionDrop[]>();
		for (const [planet, nodes] of Object.entries(missionRewards)) {
			for (const [node, mission] of Object.entries(nodes)) {
				const pools = Array.isArray(mission.rewards)
					? [["", mission.rewards] as const]
					: Object.entries(mission.rewards);
				for (const [rotation, rewards] of pools) {
					const unique = new Map(
						rewards
							.filter((reward) => reward.itemName.endsWith(" Relic"))
							.map((reward) => [reward.itemName, reward.chance]),
					);
					for (const [name, probability] of unique) {
						const sources = missions.get(name) ?? [];
						sources.push({
							location: `${node}, ${planet}`,
							rotation: rotation || undefined,
							event: mission.isEvent || undefined,
							probability,
						});
						missions.set(name, sources);
					}
				}
			}
		}
		return Object.fromEntries(missions);
	},
	3_600_000,
	30 * 86_400_000,
);

export async function getRelicIndex() {
	const rewards = await getRewards();
	return {
		records: rewards?.data ?? [],
		stale: rewards?.stale ?? false,
		observedAt: rewards?.observedAt,
	};
}

export async function getRelicRecords(): Promise<{
	records: RelicRecord[];
	stale: boolean;
	observedAt?: string;
}> {
	const [rewards, missions] = await Promise.all([getRewards(), getMissions()]);
	return {
		stale: Boolean(rewards?.stale || missions?.stale),
		observedAt: rewards?.observedAt,
		records: (rewards?.data ?? []).map((record) => {
			const sources = missions?.data[`${record.name} Relic`] ?? [];
			return {
				...record,
				missions: sources,
				availability:
					sources.some((source) => !source.event) && !missions?.stale
						? "reported"
						: "unknown",
			};
		}),
	};
}

export async function withLiveDrops(item: CatalogItem): Promise<CatalogItem> {
	const { records, observedAt, stale } = await getRelicRecords();
	if (!observedAt) return item;
	return {
		...item,
		dropData: stale ? "stale" : "wfcd",
		components: item.components.map((part) => ({
			...part,
			sources: records.flatMap((record) => {
				const reward = record.rewards.find(
					(entry) => entry.name === rewardName(item, part),
				);
				return reward
					? [
							{
								kind: "relic" as const,
								probabilities: reward.probabilities,
								relic: {
									id: record.id,
									name: record.name,
									missions: record.missions,
								},
							},
						]
					: [];
			}),
		})),
	};
}
