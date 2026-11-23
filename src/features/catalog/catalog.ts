import { fixtureItems } from "./fixtures";
import type { DropSource, Refinement } from "./models";

export function listItems() {
	return fixtureItems;
}

export function findItem(slug: string) {
	return listItems().find((item) => item.slug === slug);
}

export function getDropChance(source: DropSource, refinement: Refinement) {
	return source.kind === "relic"
		? source.probabilities?.[refinement]
		: source.probability;
}

export function describeSource(source: DropSource) {
	return source.kind === "relic"
		? source.relic.name
		: [source.location, source.rotation && `Rotation ${source.rotation}`]
				.filter(Boolean)
				.join(" · ");
}
