import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	headers: new Headers(),
	userId: "",
	setHeader: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => state.headers,
	setResponseHeader: state.setHeader,
}));
vi.mock("#/lib/auth", () => ({
	auth: {
		api: {
			getSession: async () =>
				state.userId ? { user: { id: state.userId } } : null,
		},
	},
}));

describe.skipIf(process.env.ORBITAL_POSTGRES_TEST !== "1")(
	"personal records in isolated PostgreSQL",
	() => {
		const name = `orbital_test_${randomBytes(6).toString("hex")}`;
		let admin: pg.Pool;
		let isolated: pg.Pool;
		let service: typeof import("./inventory.server");

		beforeAll(async () => {
			const url = new URL(process.env.DATABASE_URL ?? "");
			admin = new pg.Pool({ connectionString: url.href });
			await admin.query(`CREATE DATABASE "${name}"`);
			url.pathname = `/${name}`;
			isolated = new pg.Pool({ connectionString: url.href });
			vi.stubEnv("DATABASE_URL", url.href);
			vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
			const files = (await readdir("drizzle"))
				.filter((file) => file.endsWith(".sql"))
				.sort();
			for (const [index, file] of files.entries()) {
				await isolated.query(
					(await readFile(`drizzle/${file}`, "utf8")).replaceAll(
						"--> statement-breakpoint",
						"",
					),
				);
				if (!index) {
					await isolated.query(
						`INSERT INTO "user" ("id", "name", "email") VALUES ('first','First','first@example.test'), ('second','Second','second@example.test')`,
					);
					await isolated.query(`INSERT INTO "personal_entry" ("userId", "view", "itemSlug", "quantity")
					VALUES ('first','inventory','ash-prime',2), ('first','wishlist','rhino-prime',1), ('second','history','volt-prime',1)`);
				}
			}
			service = await import("./inventory.server");
		});

		afterAll(async () => {
			if (service) await (await import("#/db/index")).db.$client.end();
			await isolated?.end();
			if (admin) {
				await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
				await admin.end();
			}
			vi.unstubAllEnvs();
		});

		it("copies inventory and wishlist while preserving original history and leaves component ownership empty", async () => {
			const first = await service.getOwnedRecords("first");
			expect(first.equipment).toEqual([
				{ equipmentId: "ash-prime", quantity: 2 },
			]);
			expect(first.goals).toEqual([
				{ equipmentId: "rhino-prime", priority: 2, completedAt: null },
			]);
			expect(first.parts).toEqual([]);
			expect(
				(
					await isolated.query(
						`SELECT count(*)::int AS total FROM orbital_archive.personal_entry WHERE view = 'history'`,
					)
				).rows[0].total,
			).toBe(1);
		});

		it("rejects absent sessions and foreign origins, and scopes goal mutations to the authenticated user", async () => {
			state.headers.set("origin", "https://foreign.test");
			await expect(service.requirePersonalWrite()).rejects.toThrow("origin");
			state.headers.set("origin", "http://localhost:3000");
			await expect(service.requirePersonalWrite()).rejects.toThrow("Sign in");
			state.userId = "second";
			const current = await service.requirePersonalWrite();
			expect(current).toBe("second");
			expect(state.setHeader).toHaveBeenCalledWith(
				"Cache-Control",
				"private, no-store",
			);
			await expect(
				service.saveGoal(current, "rhino-prime", 2, "complete"),
			).rejects.toThrow("not found");
			await service.saveGoal(current, "rhino-prime", 1, "save");
			await service.saveGoal(current, "rhino-prime", undefined, "save");
			await service.saveGoal(current, "rhino-prime", 1, "complete");
			expect(
				(await service.getOwnedRecords("first")).goals[0].completedAt,
			).toBeNull();
			const second = await service.getOwnedRecords("second");
			expect(second.goals[0].completedAt).toBeTruthy();
			expect(second.goals[0].priority).toBe(1);
			expect(second.equipment).toEqual([
				{ equipmentId: "rhino-prime", quantity: 1 },
			]);
			expect(second.parts).toEqual([]);
		});
	},
);
