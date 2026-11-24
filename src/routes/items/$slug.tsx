import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadEquipmentRecord } from "#/features/catalog/item-data";
import { ItemDetails, MissingItem } from "#/features/catalog/item-details";

export const Route = createFileRoute("/items/$slug")({
	loader: async ({ params }) => {
		const data = await loadEquipmentRecord({ data: params.slug });
		if (!data.item && data.source !== "unavailable") throw notFound();
		return data;
	},
	component: Details,
	notFoundComponent: MissingItem,
	head: ({ loaderData }) => ({
		meta: [
			{
				title: `${loaderData?.item?.name ?? "Equipment File"} | Orbital Field Desk`,
			},
		],
	}),
});

function Details() {
	const { item } = Route.useLoaderData();
	return item ? (
		<ItemDetails item={item} />
	) : (
		<p className="workspace-message">
			Equipment catalog unavailable. Try again later.
		</p>
	);
}
