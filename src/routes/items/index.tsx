import { createFileRoute } from "@tanstack/react-router";
import { CatalogLoading, ItemCatalog } from "#/features/catalog/item-catalog";
import { loadCatalog } from "#/features/catalog/item-data";
import { type Category, categories } from "#/features/catalog/models";

export const Route = createFileRoute("/items/")({
	validateSearch: (
		search: Record<string, unknown>,
	): { q?: string; category?: Category; page?: number } => ({
		q: typeof search.q === "string" ? search.q : undefined,
		category: categories.find((category) => category === search.category),
		page:
			typeof search.page === "number" &&
			Number.isSafeInteger(search.page) &&
			search.page > 1
				? search.page
				: undefined,
	}),
	loader: () => loadCatalog(),
	component: CatalogPage,
	pendingComponent: CatalogLoading,
	head: () => ({ meta: [{ title: "Item Catalog | Orbital Field Desk" }] }),
});

function CatalogPage() {
	const { items, source, observedAt } = Route.useLoaderData();
	const { q, category, page } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<ItemCatalog
			items={items}
			source={source}
			observedAt={observedAt}
			page={page ?? 1}
			onPageChange={(value) =>
				void navigate({
					to: "/items",
					search: (prev) => ({ ...prev, page: value > 1 ? value : undefined }),
					resetScroll: false,
				})
			}
			query={q ?? ""}
			category={category ?? "All"}
			onQueryChange={(query) =>
				void navigate({
					to: "/items",
					search: (prev) => ({
						...prev,
						q: query || undefined,
						page: undefined,
					}),
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
						page: undefined,
					}),
					replace: true,
					resetScroll: false,
				})
			}
		/>
	);
}
