import type { CatalogItem, Component, DropRarity, DropSource } from "./models";

// Chances describe one reward of the given rarity on a single relic opening.
const exampleRewards = {
	Common: { Intact: 25.33, Exceptional: 23.33, Flawless: 20, Radiant: 16.67 },
	Uncommon: { Intact: 11, Exceptional: 13, Flawless: 17, Radiant: 20 },
	Rare: { Intact: 2, Exceptional: 4, Flawless: 6, Radiant: 10 },
};

function relic(name: string, rarity: DropRarity): DropSource {
	return {
		kind: "relic",
		relic: { name },
		rarity,
		probabilities: exampleRewards[rarity],
	};
}

function components(
	names: readonly string[],
	examples: Partial<Record<string, DropSource>> = {},
): Component[] {
	return names.map((name) => {
		const example = examples[name];
		return { name, quantity: 1, sources: example ? [example] : [] };
	});
}

const frameParts = ["Blueprint", "Neuroptics", "Chassis", "Systems"];
const rifleParts = ["Blueprint", "Barrel", "Receiver", "Stock"];

// Sources are illustrative snapshots. They do not imply current relic availability.
export const fixtureItems: readonly CatalogItem[] = [
	{
		slug: "rhino-prime",
		name: "Rhino Prime",
		category: "Warframe",
		edition: "Prime",
		artwork: "frame",
		components: components(frameParts, {
			Blueprint: relic("Neo R1", "Rare"),
			Neuroptics: relic("Lith B1", "Uncommon"),
			Chassis: relic("Lith E1", "Uncommon"),
			Systems: relic("Axi S3", "Common"),
		}),
	},
	{
		slug: "burston-prime",
		name: "Burston Prime",
		category: "Primary",
		edition: "Prime",
		artwork: "rifle",
		components: components(rifleParts, {
			Blueprint: relic("Meso D9", "Common"),
			Receiver: relic("Lith C15", "Common"),
			Stock: relic("Neo Y2", "Common"),
		}),
	},
	{
		slug: "lex-prime",
		name: "Lex Prime",
		category: "Secondary",
		edition: "Prime",
		artwork: "sidearm",
		components: components(["Blueprint", "Barrel", "Receiver"], {
			Receiver: relic("Axi D6", "Common"),
		}),
	},
	{
		slug: "orthos-prime",
		name: "Orthos Prime",
		category: "Melee",
		edition: "Prime",
		artwork: "blade",
		components: [
			...components(["Blueprint", "Handle"]),
			{ name: "Blade", quantity: 2, sources: [relic("Axi D6", "Uncommon")] },
		],
	},
	{
		slug: "mag-prime",
		name: "Mag Prime",
		category: "Warframe",
		edition: "Prime",
		artwork: "frame",
		components: components(frameParts),
	},
	{
		slug: "braton-prime",
		name: "Braton Prime",
		category: "Primary",
		edition: "Prime",
		artwork: "rifle",
		components: components(rifleParts),
	},
	{
		slug: "nyx-prime",
		name: "Nyx Prime",
		category: "Warframe",
		edition: "Prime",
		artwork: "frame",
		components: components(frameParts),
	},
	{
		slug: "fang-prime",
		name: "Fang Prime",
		category: "Melee",
		edition: "Prime",
		artwork: "blade",
		components: [
			...components(["Blueprint"]),
			{ name: "Blade", quantity: 2, sources: [relic("Lith A13", "Common")] },
			{ name: "Handle", quantity: 2, sources: [] },
		],
	},
];
