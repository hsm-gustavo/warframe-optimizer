import { describe, expect, it } from "vitest";
import type { CatalogItem } from "#/features/catalog/models";
import {
	chanceOfCopies,
	completion,
	expectedAdditionalOpenings,
	expectedAttempts,
	planPart,
	remainingParts,
	squadProbability,
} from "./planning";

const equipment: CatalogItem = {
	name: "Example Prime",
	slug: "example-prime",
	category: "Melee",
	edition: "Prime",
	artwork: "blade",
	components: [
		{
			id: "blade",
			name: "Blade",
			quantity: 2,
			sources: [
				{
					kind: "relic",
					relic: {
						id: "lith-a1",
						name: "Lith A1",
						missions: [{ location: "Void", rotation: "A", probability: 20 }],
					},
					probabilities: { Intact: 25, Radiant: 16 },
				},
				{
					kind: "relic",
					relic: { id: "axi-a1", name: "Axi A1" },
					probabilities: { Radiant: 30 },
				},
			],
		},
		{ id: "handle", name: "Handle", quantity: 1, sources: [] },
	],
};

describe("independent reward opportunities", () => {
	it("calculates single and repeated success odds", () => {
		expect(chanceOfCopies(0.25, 2, 1)).toBeCloseTo(0.4375);
		expect(chanceOfCopies(0.25, 3, 2)).toBeCloseTo(0.15625);
		expect(chanceOfCopies(0.5, 4, 4)).toBeCloseTo(0.0625);
		expect(expectedAttempts(0.25)).toBe(4);
		expect(expectedAttempts(0.25, 2)).toBe(8);
	});
	it("accounts for a fixed stock of relics without treating their expected drops as guaranteed", () => {
		expect(expectedAdditionalOpenings(0.25, 1, 2)).toBe(7);
		expect(expectedAdditionalOpenings(0.5, 2, 1)).toBe(0.5);
		expect(expectedAdditionalOpenings(1, 5, 2)).toBe(0);
		expect(expectedAdditionalOpenings(0, 5, 2)).toBeUndefined();
	});

	it("uses independent heterogeneous squad rolls", () => {
		expect(squadProbability([0.02, 0.1, 0.25])).toBeCloseTo(0.3385);
		expect(squadProbability([0, 1])).toBe(1);
		expect(squadProbability([2])).toBeUndefined();
	});
	it("handles zero chance, zero copies and impossible or invalid inputs", () => {
		expect(expectedAttempts(0)).toBeUndefined();
		expect(expectedAttempts(0, 0)).toBe(0);
		expect(chanceOfCopies(0, 9, 1)).toBe(0);
		expect(chanceOfCopies(1, 1, 2)).toBe(0);
		expect(chanceOfCopies(0.5, 0, 0)).toBe(1);
		expect(chanceOfCopies(0.5, -1, 2)).toBeUndefined();
	});
});

describe("personal planning", () => {
	it("counts copies and ignores built equipment ownership", () => {
		const parts = remainingParts(
			equipment,
			new Map([
				["blade", 1],
				["example-prime", 9],
			]),
		);
		expect(parts.map((part) => [part.owned, part.missing])).toEqual([
			[1, 1],
			[0, 1],
		]);
		expect(completion(parts)).toBe(33);
		expect(
			completion(
				remainingParts(
					equipment,
					new Map([
						["blade", 5],
						["handle", 1],
					]),
				),
			),
		).toBe(100);
		expect(completion([])).toBeUndefined();
	});
	it("prefers the exact owned refinement and models collection separately", () => {
		const part = remainingParts(equipment, new Map())[0];
		const ranked = planPart(
			part,
			[{ relicId: "lith-a1", refinement: "Intact", quantity: 1 }],
			"owned",
			"Any",
		);
		expect(ranked[0]).toMatchObject({
			level: "Intact",
			owned: 1,
			openings: 8,
			acquisitionAttempts: 35,
		});
		expect(
			chanceOfCopies(ranked[0].probability, ranked[0].owned, part.missing),
		).toBe(0);
		expect(planPart(part, [], "time", "Any")).toEqual([]);
		expect(planPart(part, [], "time", "Any", 5, 2)[0].totalMinutes).toBe(120);
		expect(
			planPart(remainingParts(equipment, new Map())[1], [], "openings", "Any"),
		).toEqual([]);
	});
});
