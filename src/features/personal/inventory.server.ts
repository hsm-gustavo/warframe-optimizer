import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import {
	componentInventory,
	equipmentOwnership,
	farmingGoal,
	relicInventory,
} from "#/db/schema";
import { auth } from "#/lib/auth";

export async function personalSession() {
	setResponseHeader("Cache-Control", "private, no-store");
	return auth.api.getSession({ headers: getRequestHeaders() });
}

export async function requirePersonalWrite() {
	const url = process.env.BETTER_AUTH_URL;
	if (!url || getRequestHeaders().get("origin") !== new URL(url).origin)
		throw new Error("Invalid request origin.");
	const session = await personalSession();
	if (!session) throw new Error("Sign in to save Personal Files.");
	return session.user.id;
}

export async function getOwnedRecords(userId: string) {
	const [equipment, parts, relics, goals] = await Promise.all([
		db
			.select()
			.from(equipmentOwnership)
			.where(eq(equipmentOwnership.userId, userId)),
		db
			.select()
			.from(componentInventory)
			.where(eq(componentInventory.userId, userId)),
		db.select().from(relicInventory).where(eq(relicInventory.userId, userId)),
		db
			.select()
			.from(farmingGoal)
			.where(eq(farmingGoal.userId, userId))
			.orderBy(farmingGoal.priority),
	]);
	return {
		equipment: equipment.map(({ equipmentId, quantity }) => ({
			equipmentId,
			quantity,
		})),
		parts: parts.map(({ componentId, quantity }) => ({
			componentId,
			quantity,
		})),
		relics: relics.map(({ relicId, refinement, quantity }) => ({
			relicId,
			refinement,
			quantity,
		})),
		goals: goals.map(({ equipmentId, priority, completedAt }) => ({
			equipmentId,
			priority,
			completedAt,
		})),
	};
}

export async function equipmentRecordKey(
	userId: string,
	slug: string,
	sourceId: string,
	kind: "goal" | "equipment",
) {
	if (sourceId === slug) return slug;
	const table = kind === "goal" ? farmingGoal : equipmentOwnership;
	const [legacy] = await db
		.select({ equipmentId: table.equipmentId })
		.from(table)
		.where(and(eq(table.userId, userId), eq(table.equipmentId, slug)));
	return legacy ? slug : sourceId;
}

export async function saveGoal(
	userId: string,
	equipmentId: string,
	priority: number | undefined,
	operation: "save" | "remove" | "complete",
	ownershipId = equipmentId,
) {
	const scope = and(
		eq(farmingGoal.userId, userId),
		eq(farmingGoal.equipmentId, equipmentId),
	);
	if (operation === "remove") {
		await db.delete(farmingGoal).where(scope);
		return;
	}
	if (operation === "complete") {
		await db.transaction(async (tx) => {
			const [goal] = await tx
				.update(farmingGoal)
				.set({ completedAt: sql`coalesce(${farmingGoal.completedAt}, now())` })
				.where(scope)
				.returning({ equipmentId: farmingGoal.equipmentId });
			if (!goal) throw new Error("Farming goal was not found.");
			await tx
				.insert(equipmentOwnership)
				.values({ userId, equipmentId: ownershipId, quantity: 1 })
				.onConflictDoNothing();
		});
		return;
	}
	const insert = db
		.insert(farmingGoal)
		.values({ userId, equipmentId, priority: priority ?? 2 });
	if (priority === undefined) await insert.onConflictDoNothing();
	else
		await insert.onConflictDoUpdate({
			target: [farmingGoal.userId, farmingGoal.equipmentId],
			set: { priority },
		});
}
