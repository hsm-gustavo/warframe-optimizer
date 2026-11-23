import { createFileRoute, notFound } from "@tanstack/react-router";
import { findItem } from "#/features/catalog/catalog";
import { ItemDetails, MissingItem } from "#/features/catalog/item-details";

export const Route = createFileRoute("/items/$slug")({
	loader: ({ params }) => {
		const item = findItem(params.slug);
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
