import type { ItemArtwork } from "#/components/retro/item-icon";

export const categories = [
	"Warframe",
	"Primary",
	"Secondary",
	"Melee",
] as const;
export type Category = (typeof categories)[number];

export const refinements = [
	"Intact",
	"Exceptional",
	"Flawless",
	"Radiant",
] as const;
export type Refinement = (typeof refinements)[number];

export type DropRarity = "Common" | "Uncommon" | "Rare";

export interface Relic {
	name: string;
}

export type DropSource =
	| {
			kind: "relic";
			relic: Relic;
			rarity: DropRarity;
			probabilities?: Partial<Record<Refinement, number>>;
	  }
	| {
			kind: "mission";
			location: string;
			rotation?: string;
			probability?: number;
	  };

export interface Component {
	name: string;
	quantity: number;
	sources: readonly DropSource[];
}

export interface MarketQuote {
	platinum: number;
	observedAt: string;
	platform: string;
}

export interface CatalogItem {
	slug: string;
	name: string;
	category: Category;
	edition: "Prime";
	artwork: ItemArtwork;
	components: readonly Component[];
	market?: MarketQuote;
}
