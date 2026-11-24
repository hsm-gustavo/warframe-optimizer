import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.resetModules();
});

it("never substitutes sample items for unavailable production data", async () => {
	vi.stubEnv("REDIS_URL", "");
	vi.stubEnv("NODE_ENV", "production");
	vi.stubEnv("WARFRAME_FIXTURES", "1");
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
	const { getCatalog } = await import("./equipment.server");
	expect(await getCatalog()).toEqual({ source: "unavailable", items: [] });
});

it("makes the equipment fixtures explicitly opt-in outside production", async () => {
	vi.stubEnv("REDIS_URL", "");
	vi.stubEnv("WARFRAME_FIXTURES", "1");
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
	const { getCatalog } = await import("./equipment.server");
	expect(await getCatalog()).toMatchObject({ source: "sample" });
});
