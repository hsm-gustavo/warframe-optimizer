import { createFileRoute } from "@tanstack/react-router";
import { listItems } from "#/features/catalog/catalog";
import { Optimizer } from "#/features/optimizer/optimizer";

export const Route = createFileRoute("/optimizer")({
	validateSearch: (search: Record<string, unknown>): { item?: string } => ({
		item: typeof search.item === "string" ? search.item : undefined,
	}),
	loader: () => listItems(),
	component: OptimizerPage,
	head: () => ({ meta: [{ title: "Farming Optimizer | Orbital Field Desk" }] }),
});

function OptimizerPage() {
	const items = Route.useLoaderData();
	const { item: slug } = Route.useSearch();
	const navigate = Route.useNavigate();
	const item =
		items.find((item) => item.slug === (slug ?? "burston-prime")) ?? items[0];

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
