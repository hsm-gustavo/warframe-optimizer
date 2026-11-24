import { createFileRoute } from "@tanstack/react-router";
import {
	loadPersonalFiles,
	type PersonalView,
	personalViews,
} from "#/features/personal/personal-data";
import { PersonalFiles } from "#/features/personal/personal-files";

export const Route = createFileRoute("/app")({
	validateSearch: (
		search: Record<string, unknown>,
	): { view?: PersonalView; pick?: string } => ({
		view:
			personalViews.find((entry) => entry === search.view) ??
			(search.view === "wishlist" ? "goals" : undefined),
		pick:
			typeof search.pick === "string" && search.pick.length <= 512
				? search.pick
				: undefined,
	}),
	loader: () => loadPersonalFiles(),
	component: PersonalPage,
	head: () => ({ meta: [{ title: "Personal Files | Orbital Field Desk" }] }),
});

function PersonalPage() {
	const { view, pick } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<PersonalFiles
			data={Route.useLoaderData()}
			view={view ?? "equipment"}
			pick={pick}
			onViewChange={(value) =>
				void navigate({
					to: "/app",
					search: { view: personalViews.find((entry) => entry === value) },
					resetScroll: false,
				})
			}
		/>
	);
}
