import { createFileRoute } from "@tanstack/react-router";
import { loadCatalog } from "#/features/catalog/item-data";
import { Home } from "#/features/home/home";
import { loadDesktopGoals } from "#/features/personal/personal-data";
import { loadRelicFeedStatus } from "#/features/relics/relic-data";

export const Route = createFileRoute("/")({
	loader: async () => {
		const [{ items, ...catalog }, goals, relicFeed] = await Promise.all([
			loadCatalog(),
			loadDesktopGoals(),
			loadRelicFeedStatus(),
		]);
		return { catalog: { ...catalog, count: items.length }, goals, relicFeed };
	},
	component: DesktopHome,
});

function DesktopHome() {
	return <Home {...Route.useLoaderData()} />;
}
