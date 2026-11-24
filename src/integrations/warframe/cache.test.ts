import { afterEach, expect, it, vi } from "vitest";
import { createSnapshot } from "./cache.server";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
});

it("retains the last successful snapshot through an outage and expires it on schedule", async () => {
	vi.stubEnv("REDIS_URL", "");
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(0);
	const load = vi
		.fn()
		.mockResolvedValueOnce(["real catalog"])
		.mockRejectedValue(new Error("down"));
	const snapshot = createSnapshot("test", load, 100, 1000);
	const [a, b] = await Promise.all([snapshot(), snapshot()]);
	expect(a).toEqual(b);
	expect(load).toHaveBeenCalledTimes(1);
	vi.setSystemTime(101);
	expect(await snapshot()).toMatchObject({
		stale: true,
		data: ["real catalog"],
	});
	vi.setSystemTime(1001);
	expect(await snapshot()).toBeNull();
});
