import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { findItem, listItems } from "#/features/catalog/catalog";

export const personalViewIds = ["inventory", "wishlist", "history"] as const;
export type PersonalView = (typeof personalViewIds)[number];

async function getPersonalSession() {
	setResponseHeader("Cache-Control", "private, no-store");
	const { auth } = await import("#/lib/auth");
	return auth.api.getSession({ headers: getRequestHeaders() });
}

export const loadPersonalFiles = createServerFn().handler(async () => {
	const session = await getPersonalSession();
	if (!session) return null;

	const { db } = await import("#/db/index");
	const { personalEntry } = await import("#/db/schema");
	const entries = await db
		.select({
			view: personalEntry.view,
			itemSlug: personalEntry.itemSlug,
			quantity: personalEntry.quantity,
			updatedAt: personalEntry.updatedAt,
		})
		.from(personalEntry)
		.where(eq(personalEntry.userId, session.user.id))
		.orderBy(personalEntry.itemSlug);

	return {
		user: { name: session.user.name, role: session.user.role },
		items: listItems().map(({ slug, name }) => ({ slug, name })),
		entries,
	};
});

export const savePersonalEntry = createServerFn({ method: "POST" })
	.validator(
		z.object({
			view: z.enum(["inventory", "wishlist", "history"]),
			itemSlug: z.string().min(1).max(128),
			quantity: z.number().int().min(0).max(9999),
		}),
	)
	.handler(async ({ data }) => {
		const appUrl = process.env.BETTER_AUTH_URL;
		if (
			!appUrl ||
			getRequestHeaders().get("origin") !== new URL(appUrl).origin
		) {
			throw new Error("Invalid request origin.");
		}
		const session = await getPersonalSession();
		if (!session) throw new Error("Sign in to update Personal Files.");

		const { db } = await import("#/db/index");
		const { personalEntry } = await import("#/db/schema");
		const userId = session.user.id;

		if (data.quantity === 0) {
			await db
				.delete(personalEntry)
				.where(
					and(
						eq(personalEntry.userId, userId),
						eq(personalEntry.view, data.view),
						eq(personalEntry.itemSlug, data.itemSlug),
					),
				);
		} else {
			if (!findItem(data.itemSlug)) throw new Error("Unknown equipment.");
			const quantity = data.view === "inventory" ? data.quantity : 1;
			await db
				.insert(personalEntry)
				.values({ ...data, userId, quantity })
				.onConflictDoUpdate({
					target: [
						personalEntry.userId,
						personalEntry.view,
						personalEntry.itemSlug,
					],
					set: { quantity, updatedAt: new Date().toISOString() },
				});
		}
	});
