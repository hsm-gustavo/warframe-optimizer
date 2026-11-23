import { createFileRoute } from "@tanstack/react-router";
import { listItems } from "#/features/catalog/catalog";
import { CatalogLoading, ItemCatalog } from "#/features/catalog/item-catalog";
import { type Category, categories } from "#/features/catalog/models";

export const Route = createFileRoute("/items/")({
	validateSearch: (
		search: Record<string, unknown>,
	): { q?: string; category?: Category } => ({
		q: typeof search.q === "string" ? search.q : undefined,
		category: categories.find((category) => category === search.category),
	}),
	loader: () => listItems(),
	component: CatalogPage,
	pendingComponent: CatalogLoading,
	head: () => ({ meta: [{ title: "Item Catalog | Orbital Field Desk" }] }),
});

function CatalogPage() {
	const items = Route.useLoaderData();
	const { q, category } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<ItemCatalog
			items={items}
			query={q ?? ""}
			category={category ?? "All"}
			onQueryChange={(query) =>
				void navigate({
					to: "/items",
					search: (prev) => ({ ...prev, q: query || undefined }),
					replace: true,
					resetScroll: false,
				})
			}
			onCategoryChange={(value) =>
				void navigate({
					to: "/items",
					search: (prev) => ({
						...prev,
						category: value === "All" ? undefined : value,
					}),
					replace: true,
					resetScroll: false,
				})
			}
		/>
	);
}
