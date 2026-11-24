import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { componentId, refinements } from "#/features/catalog/models";
import {
	getRelicIndex,
	withLiveDrops,
} from "#/integrations/warframe/drops.server";
import { getCatalog } from "#/integrations/warframe/equipment.server";
import {
	equipmentRecordKey,
	getOwnedRecords,
	personalSession,
	requirePersonalWrite,
	saveGoal,
} from "./inventory.server";

export const personalViews = ["equipment", "parts", "relics", "goals"] as const;
export type PersonalView = (typeof personalViews)[number];
const id = z.string().min(1).max(512);
const quantity = z.number().int().min(0).max(9999);

export const loadPersonalFiles = createServerFn().handler(async () => {
	const session = await personalSession();
	if (!session) return null;
	const [owned, catalog, relicIndex] = await Promise.all([
		getOwnedRecords(session.user.id),
		getCatalog(),
		getRelicIndex(),
	]);
	const slugs = new Map(
		catalog.items.flatMap((item) =>
			item.sourceId ? [[item.sourceId, item.slug]] : [],
		),
	);
	const toSlug = (id: string) => slugs.get(id) ?? id;
	const goals = owned.goals.map((goal) => ({
		...goal,
		equipmentId: toSlug(goal.equipmentId),
	}));
	const equipment = owned.equipment.map((record) => ({
		...record,
		equipmentId: toSlug(record.equipmentId),
	}));
	const goalIds = new Set(goals.map((goal) => goal.equipmentId));
	const goalItems = await Promise.all(
		catalog.items.filter((item) => goalIds.has(item.slug)).map(withLiveDrops),
	);
	const ownedRelicIds = new Set(owned.relics.map((record) => record.relicId));
	const goalSources = goalItems.map((item) => ({
		slug: item.slug,
		relics: Array.from(
			new Map(
				item.components
					.filter(
						(part) =>
							(owned.parts.find(
								(entry) => entry.componentId === componentId(item.slug, part),
							)?.quantity ?? 0) < part.quantity,
					)
					.flatMap((part) =>
						part.sources.flatMap((source) =>
							source.kind === "relic" &&
							source.relic.id &&
							ownedRelicIds.has(source.relic.id)
								? ([
										[
											source.relic.id,
											{ id: source.relic.id, name: source.relic.name },
										],
									] as const)
								: [],
						),
					),
			).values(),
		),
	}));
	return {
		user: { name: session.user.name },
		...owned,
		goals,
		equipment,
		items: catalog.items.map((item) => ({
			slug: item.slug,
			name: item.name,
			parts: item.components.map((part) => ({
				id: componentId(item.slug, part),
				name: part.name,
				quantity: part.quantity,
			})),
		})),
		relicIndex: relicIndex.records.map(({ id, name, era }) => ({
			id,
			name,
			era,
		})),
		goalSources,
	};
});

export const saveInventory = createServerFn({ method: "POST" })
	.validator(
		z.discriminatedUnion("kind", [
			z.object({ kind: z.literal("equipment"), id, quantity }),
			z.object({ kind: z.literal("part"), id, quantity }),
			z.object({
				kind: z.literal("relic"),
				id,
				quantity,
				refinement: z.enum(refinements),
			}),
		]),
	)
	.handler(async ({ data }) => {
		const userId = await requirePersonalWrite();
		const { db } = await import("#/db/index");
		const { equipmentOwnership, componentInventory, relicInventory } =
			await import("#/db/schema");
		if (data.kind === "relic") {
			const { refinement } = data;
			if (!data.quantity) {
				await db
					.delete(relicInventory)
					.where(
						and(
							eq(relicInventory.userId, userId),
							eq(relicInventory.relicId, data.id),
							eq(relicInventory.refinement, refinement),
						),
					);
			} else {
				const { records } = await getRelicIndex();
				if (
					!records.some(
						(record) =>
							record.id === data.id &&
							record.rewards.some(
								(reward) => reward.probabilities[refinement] !== undefined,
							),
					)
				)
					throw new Error("Relic refinement unavailable.");
				await db
					.insert(relicInventory)
					.values({
						userId,
						relicId: data.id,
						refinement,
						quantity: data.quantity,
					})
					.onConflictDoUpdate({
						target: [
							relicInventory.userId,
							relicInventory.relicId,
							relicInventory.refinement,
						],
						set: { quantity: data.quantity },
					});
			}
			return;
		}
		const { items } =
			data.quantity || data.kind === "equipment"
				? await getCatalog()
				: { items: [] };
		if (data.kind === "equipment") {
			const item = items.find((item) => item.slug === data.id);
			const storedId = await equipmentRecordKey(
				userId,
				data.id,
				item?.sourceId ?? data.id,
				"equipment",
			);
			if (!data.quantity)
				await db
					.delete(equipmentOwnership)
					.where(
						and(
							eq(equipmentOwnership.userId, userId),
							eq(equipmentOwnership.equipmentId, storedId),
						),
					);
			else {
				if (!item) throw new Error("Equipment unavailable.");
				await db
					.insert(equipmentOwnership)
					.values({ userId, equipmentId: storedId, quantity: data.quantity })
					.onConflictDoUpdate({
						target: [equipmentOwnership.userId, equipmentOwnership.equipmentId],
						set: { quantity: data.quantity },
					});
			}
		} else if (!data.quantity)
			await db
				.delete(componentInventory)
				.where(
					and(
						eq(componentInventory.userId, userId),
						eq(componentInventory.componentId, data.id),
					),
				);
		else {
			if (
				!items.some((item) =>
					item.components.some(
						(part) => componentId(item.slug, part) === data.id,
					),
				)
			)
				throw new Error("Component unavailable.");
			await db
				.insert(componentInventory)
				.values({ userId, componentId: data.id, quantity: data.quantity })
				.onConflictDoUpdate({
					target: [componentInventory.userId, componentInventory.componentId],
					set: { quantity: data.quantity },
				});
		}
	});

export const updateGoal = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id,
			priority: z.number().int().min(1).max(3).optional(),
			operation: z.enum(["save", "remove", "complete"]),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await requirePersonalWrite();
		const { items } = await getCatalog();
		const item = items.find((entry) => entry.slug === data.id);
		if (data.operation === "save" && !item)
			throw new Error("Equipment unavailable.");
		const sourceId = item?.sourceId ?? data.id;
		const goalId = await equipmentRecordKey(userId, data.id, sourceId, "goal");
		const ownedId =
			data.operation === "complete"
				? await equipmentRecordKey(userId, data.id, sourceId, "equipment")
				: undefined;
		await saveGoal(userId, goalId, data.priority, data.operation, ownedId);
	});

export const loadPlannerStock = createServerFn().handler(async () => {
	const session = await personalSession();
	if (!session) return null;
	const { parts, relics } = await getOwnedRecords(session.user.id);
	return { parts, relics };
});

export const loadDesktopGoals = createServerFn().handler(async () => {
	const session = await personalSession();
	if (!session) return [];
	const [{ goals, parts }, { items }] = await Promise.all([
		getOwnedRecords(session.user.id),
		getCatalog(),
	]);
	const { completion, remainingParts } = await import(
		"#/features/optimizer/planning"
	);
	const inventory = new Map(
		parts.map((part) => [part.componentId, part.quantity]),
	);
	return goals
		.filter((goal) => !goal.completedAt)
		.slice(0, 5)
		.map((goal) => {
			const item = items.find(
				(entry) =>
					entry.slug === goal.equipmentId ||
					entry.sourceId === goal.equipmentId,
			);
			return {
				slug: item?.slug ?? goal.equipmentId,
				name: item?.name ?? goal.equipmentId,
				progress: item
					? completion(remainingParts(item, inventory))
					: undefined,
			};
		});
});
