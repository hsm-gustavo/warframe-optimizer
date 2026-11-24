import type { ItemArtwork } from "#/components/retro/item-icon";

export const categories = [
	"Warframe",
	"Primary",
	"Secondary",
	"Melee",
	"Arch-Gun",
	"Sentinel",
	"Sentinel Weapon",
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

export interface MissionDrop {
	location: string;
	rotation?: string;
	event?: boolean;
	probability: number;
}

export interface Relic {
	name: string;
	id?: string;
	missions?: readonly MissionDrop[];
}

export type DropSource =
	| {
			kind: "relic";
			relic: Relic;
			rarity?: DropRarity;
			probabilities?: Partial<Record<Refinement, number>>;
	  }
	| {
			kind: "mission";
			location: string;
			rotation?: string;
			probability?: number;
	  };

export interface Component {
	id?: string;
	tradable?: boolean;
	ducats?: number;
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
	sourceId?: string;
	slug: string;
	name: string;
	category: Category;
	edition: "Prime";
	artwork: ItemArtwork;
	components: readonly Component[];
	dropData?: "wfcd" | "stale";
}

export function componentId(equipmentSlug: string, part: Component) {
	return part.id ?? `${equipmentSlug}/${part.name.toLowerCase()}`;
}

export function rewardName(item: CatalogItem, part: Component) {
	return `${item.name} ${part.name}${item.category === "Warframe" && part.name !== "Blueprint" ? " Blueprint" : ""}`;
}

export const relicEras = [
	"Lith",
	"Meso",
	"Neo",
	"Axi",
	"Requiem",
	"Omnia",
] as const;
export interface RelicRecord {
	id: string;
	name: string;
	era: string;
	availability: "reported" | "unknown";
	missions: readonly MissionDrop[];
	rewards: readonly {
		name: string;
		probabilities: Partial<Record<Refinement, number>>;
	}[];
}
