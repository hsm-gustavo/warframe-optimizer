import { createFileRoute } from "@tanstack/react-router";
import { loadOptimizer } from "#/features/catalog/item-data";
import { Optimizer } from "#/features/optimizer/optimizer";

export const Route = createFileRoute("/optimizer")({
	validateSearch: (search: Record<string, unknown>): { item?: string } => ({
		item: typeof search.item === "string" ? search.item : undefined,
	}),
	loaderDeps: ({ search }) => ({ item: search.item }),
	loader: ({ deps }) => loadOptimizer({ data: deps.item }),
	component: OptimizerPage,
	head: () => ({ meta: [{ title: "Farming Optimizer | Orbital Field Desk" }] }),
});

function OptimizerPage() {
	const { items, item, source } = Route.useLoaderData();
	const navigate = Route.useNavigate();

	if (!item)
		return <p className="workspace-message">The equipment index is empty.</p>;

	return (
		<Optimizer
			catalogSource={source}
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
