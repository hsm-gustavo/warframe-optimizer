import { createFileRoute } from "@tanstack/react-router";
import { loadOptimizer } from "#/features/catalog/item-data";
import { Optimizer } from "#/features/optimizer/optimizer";
import { loadPlannerStock } from "#/features/personal/personal-data";

export const Route = createFileRoute("/optimizer")({
	validateSearch: (search: Record<string, unknown>): { item?: string } => ({
		item: typeof search.item === "string" ? search.item : undefined,
	}),
	loaderDeps: ({ search }) => ({ item: search.item }),
	loader: async ({ deps }) => {
		const [plan, stock] = await Promise.all([
			loadOptimizer({ data: deps.item }),
			loadPlannerStock(),
		]);
		return { ...plan, stock };
	},
	component: OptimizerPage,
	head: () => ({ meta: [{ title: "Farming Optimizer | Orbital Field Desk" }] }),
});

function OptimizerPage() {
	const { items, item, stock } = Route.useLoaderData();
	const navigate = Route.useNavigate();

	if (!item)
		return (
			<p className="workspace-message">
				Equipment catalog unavailable. Try again later.
			</p>
		);

	return (
		<Optimizer
			stock={stock}
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
