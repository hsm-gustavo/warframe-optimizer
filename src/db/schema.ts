import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean().notNull().default(false),
	image: text(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
	role: text(),
	banned: boolean().default(false),
	banReason: text(),
	banExpires: timestamp(),
});

export const session = pgTable(
	"session",
	{
		id: text().primaryKey(),
		expiresAt: timestamp().notNull(),
		token: text().notNull().unique(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp().notNull().defaultNow(),
		ipAddress: text(),
		userAgent: text(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text(),
	},
	(table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text().primaryKey(),
		accountId: text().notNull(),
		providerId: text().notNull(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text(),
		refreshToken: text(),
		idToken: text(),
		accessTokenExpiresAt: timestamp(),
		refreshTokenExpiresAt: timestamp(),
		scope: text(),
		password: text(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("account_provider_idx").on(table.providerId, table.accountId),
		index("account_user_idx").on(table.userId),
	],
);

export const verification = pgTable(
	"verification",
	{
		id: text().primaryKey(),
		identifier: text().notNull(),
		value: text().notNull(),
		expiresAt: timestamp().notNull(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp().notNull().defaultNow(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

const owner = () =>
	text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" });
const quantity = () => integer().notNull();

export const equipmentOwnership = pgTable(
	"equipment_ownership",
	{
		userId: owner(),
		equipmentId: text().notNull(),
		quantity: quantity(),
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.equipmentId] }),
		check("equipment_quantity_check", sql`${t.quantity} > 0`),
	],
);

export const componentInventory = pgTable(
	"component_inventory",
	{
		userId: owner(),
		componentId: text().notNull(),
		quantity: quantity(),
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.componentId] }),
		check("component_quantity_check", sql`${t.quantity} > 0`),
	],
);

export const relicInventory = pgTable(
	"relic_inventory",
	{
		userId: owner(),
		relicId: text().notNull(),
		refinement: text({
			enum: ["Intact", "Exceptional", "Flawless", "Radiant"],
		}).notNull(),
		quantity: quantity(),
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.relicId, t.refinement] }),
		check("relic_quantity_check", sql`${t.quantity} > 0`),
		check(
			"relic_refinement_check",
			sql`${t.refinement} in ('Intact', 'Exceptional', 'Flawless', 'Radiant')`,
		),
	],
);

export const farmingGoal = pgTable(
	"farming_goal",
	{
		userId: owner(),
		equipmentId: text().notNull(),
		priority: integer().notNull().default(2),
		completedAt: timestamp({ mode: "string" }),
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.equipmentId] }),
		check("goal_priority_check", sql`${t.priority} between 1 and 3`),
	],
);

export const rateLimit = pgTable("rate_limit", {
	id: text().primaryKey(),
	key: text().notNull().unique(),
	count: integer().notNull(),
	lastRequest: bigint({ mode: "number" }).notNull(),
});
