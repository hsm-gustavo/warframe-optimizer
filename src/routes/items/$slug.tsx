import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadEquipmentRecord } from "#/features/catalog/item-data";
import { ItemDetails, MissingItem } from "#/features/catalog/item-details";

export const Route = createFileRoute("/items/$slug")({
	loader: async ({ params }) => {
		const item = await loadEquipmentRecord({ data: params.slug });
		if (!item) throw notFound();
		return item;
	},
	component: Details,
	notFoundComponent: MissingItem,
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.name ?? "Equipment File"} | Orbital Field Desk` },
		],
	}),
});

function Details() {
	return <ItemDetails item={Route.useLoaderData()} />;
}
