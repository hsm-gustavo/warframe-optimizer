import {
	type CatalogItem,
	componentId,
	type Refinement,
	refinements,
} from "#/features/catalog/models";

export function expectedAttempts(
	probability: number,
	copies = 1,
): number | undefined {
	if (
		!validProbability(probability) ||
		!Number.isSafeInteger(copies) ||
		copies < 0
	)
		return;
	if (!copies) return 0;
	return probability > 0 ? copies / probability : undefined;
}

function validProbability(p: number) {
	return Number.isFinite(p) && p >= 0 && p <= 1;
}

export function squadProbability(
	probabilities: readonly number[],
): number | undefined {
	if (!probabilities.every(validProbability)) return;
	return (
		1 -
		probabilities.reduce(
			(remaining, probability) => remaining * (1 - probability),
			1,
		)
	);
}

export function chanceOfCopies(
	probability: number,
	opportunities: number,
	copies: number,
): number | undefined {
	if (
		!validProbability(probability) ||
		!Number.isSafeInteger(opportunities) ||
		!Number.isSafeInteger(copies) ||
		opportunities < 0 ||
		copies < 0 ||
		opportunities > 10000
	)
		return;
	if (!copies) return 1;
	if (copies > opportunities || !probability) return 0;
	if (probability === 1) return 1;
	if (copies === 1)
		return -Math.expm1(opportunities * Math.log1p(-probability));
	return Math.min(
		1,
		binomialDistribution(probability, opportunities, copies)[copies],
	);
}

function binomialDistribution(
	probability: number,
	opportunities: number,
	copies: number,
) {
	const distribution = new Float64Array(copies + 1);
	distribution[0] = 1;
	for (let attempt = 0; attempt < opportunities; attempt++) {
		distribution[copies] += distribution[copies - 1] * probability;
		for (
			let successes = Math.min(copies - 1, attempt + 1);
			successes > 0;
			successes--
		) {
			distribution[successes] =
				distribution[successes] * (1 - probability) +
				distribution[successes - 1] * probability;
		}
		distribution[0] *= 1 - probability;
	}
	return distribution;
}

// After opening the owned relics, every still-missing copy needs 1/p expected openings.
export function expectedAdditionalOpenings(
	probability: number,
	owned: number,
	copies: number,
) {
	const total = expectedAttempts(probability, copies);
	if (
		total === undefined ||
		!Number.isSafeInteger(owned) ||
		owned < 0 ||
		owned > 10000
	)
		return undefined;
	if (!owned || !copies) return total;
	if (probability === 1) return Math.max(0, copies - owned);
	if (copies === 1) return total * (1 - probability) ** owned;
	const distribution = binomialDistribution(probability, owned, copies);
	let remaining = 0;
	for (let successes = 0; successes < copies; successes++)
		remaining += distribution[successes] * (copies - successes);
	return remaining / probability;
}

export function remainingParts(
	item: CatalogItem,
	inventory: ReadonlyMap<string, number>,
) {
	return item.components.map((part) => {
		const id = componentId(item.slug, part);
		const owned = inventory.get(id) ?? 0;
		return { ...part, id, owned, missing: Math.max(0, part.quantity - owned) };
	});
}

export function completion(
	parts: readonly { quantity: number; missing: number }[],
) {
	const required = parts.reduce((total, part) => total + part.quantity, 0);
	return required
		? Math.floor(
				(100 *
					(required - parts.reduce((total, part) => total + part.missing, 0))) /
					required,
			)
		: undefined;
}

export const traceCosts: Record<Refinement, number> = {
	Intact: 0,
	Exceptional: 25,
	Flawless: 50,
	Radiant: 100,
};
export type Strategy =
	| "probability"
	| "openings"
	| "owned"
	| "time"
	| "purchase";

export function planPart(
	part: ReturnType<typeof remainingParts>[number],
	stock: readonly {
		relicId: string;
		refinement: Refinement;
		quantity: number;
	}[],
	strategy: Strategy,
	refinement: Refinement | "Any",
	openingMinutes?: number,
	acquisitionMinutes?: number,
) {
	const options = part.sources.flatMap((source) => {
		if (source.kind !== "relic") return [];
		const missions = (source.relic.missions ?? []).filter(
			(mission) => mission.probability > 0 && !mission.event,
		);
		const mission = [...missions].sort(
			(a, b) => b.probability - a.probability,
		)[0];
		return refinements.flatMap((level) => {
			if (refinement !== "Any" && level !== refinement) return [];
			const probability = (source.probabilities?.[level] ?? 0) / 100;
			const openings = expectedAttempts(probability, part.missing);
			if (openings === undefined) return [];
			const owned =
				stock.find(
					(entry) =>
						entry.relicId === source.relic.id && entry.refinement === level,
				)?.quantity ?? 0;
			const stockShortfall =
				expectedAdditionalOpenings(probability, owned, part.missing) ??
				openings;
			const acquisitionAttempts = mission
				? stockShortfall / (mission.probability / 100)
				: undefined;
			const totalMinutes =
				openingMinutes !== undefined &&
				acquisitionMinutes !== undefined &&
				acquisitionAttempts !== undefined
					? openings * openingMinutes + acquisitionAttempts * acquisitionMinutes
					: undefined;
			return [
				{
					source,
					level,
					probability,
					openings,
					owned,
					stockShortfall,
					mission,
					acquisitionAttempts,
					totalMinutes,
				},
			];
		});
	});
	const ranked =
		strategy === "time"
			? options.filter((option) => option.totalMinutes !== undefined)
			: options;
	return ranked.sort((a, b) => {
		if (strategy === "time")
			return (a.totalMinutes ?? Infinity) - (b.totalMinutes ?? Infinity);
		if (strategy === "owned") {
			const preference =
				Number(Boolean(b.owned)) - Number(Boolean(a.owned)) ||
				a.stockShortfall - b.stockShortfall;
			if (preference) return preference;
		}
		return a.openings - b.openings || traceCosts[a.level] - traceCosts[b.level];
	});
}
