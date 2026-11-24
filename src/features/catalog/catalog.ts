import type { CatalogItem, DropSource, Refinement } from "./models";

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

export function prioritizeSources(
	sources: readonly DropSource[],
	refinement: Refinement,
) {
	return [...sources].sort((a, b) => {
		const reported = (source: DropSource) =>
			source.kind === "relic" && Boolean(source.relic.missions?.length);
		return (
			Number(reported(b)) - Number(reported(a)) ||
			(getDropChance(b, refinement) ?? 0) - (getDropChance(a, refinement) ?? 0)
		);
	});
}

export function dropDataLabel(item: CatalogItem) {
	if (item.dropData)
		return item.dropData === "stale"
			? "Last known WFCD drops"
			: "WFCD drop tables";
	return item.components.some((part) => part.sources.length)
		? "Sample drops"
		: "Drop data unavailable";
}
