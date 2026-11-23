import { createFileRoute } from "@tanstack/react-router";
import { loadDesktopCatalog } from "#/features/catalog/item-data";
import { Home } from "#/features/home/home";

export const Route = createFileRoute("/")({
	loader: () => loadDesktopCatalog(),
	component: DesktopHome,
});

function DesktopHome() {
	return <Home catalog={Route.useLoaderData()} />;
}
