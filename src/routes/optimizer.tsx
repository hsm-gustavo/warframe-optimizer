import { createFileRoute } from "@tanstack/react-router";
import { findItem, listItems } from "#/features/catalog/catalog";
import { loadEquipmentRecord } from "#/features/catalog/item-data";
import { Optimizer } from "#/features/optimizer/optimizer";

export const Route = createFileRoute("/optimizer")({
	validateSearch: (search: Record<string, unknown>): { item?: string } => ({
		item: typeof search.item === "string" ? search.item : undefined,
	}),
	loaderDeps: ({ search }) => ({ item: search.item }),
	loader: ({ deps }) =>
		loadEquipmentRecord({
			data: findItem(deps.item ?? "")?.slug ?? "burston-prime",
		}),
	component: OptimizerPage,
	head: () => ({ meta: [{ title: "Farming Optimizer | Orbital Field Desk" }] }),
});

function OptimizerPage() {
	const items = listItems();
	const item = Route.useLoaderData();
	const navigate = Route.useNavigate();

	if (!item)
		return <p className="workspace-message">The equipment index is empty.</p>;

	return (
		<Optimizer
			items={items}
			item={item}
			onItemChange={(slug) =>
				void navigate({
					to: "/optimizer",
					search: { item: slug },
					replace: true,
					resetScroll: false,
				})
			}
		/>
	);
}
