import { createFileRoute } from "@tanstack/react-router";
import { loadPersonalFiles } from "#/features/personal/personal-data";
import {
	PersonalFiles,
	personalViews,
} from "#/features/personal/personal-files";

export const Route = createFileRoute("/app")({
	validateSearch: (
		search: Record<string, unknown>,
	): { view?: (typeof personalViews)[number]["value"] } => ({
		view: personalViews.find((tab) => tab.value === search.view)?.value,
	}),
	loader: () => loadPersonalFiles(),
	component: PersonalPage,
	head: () => ({ meta: [{ title: "Personal Files | Orbital Field Desk" }] }),
});

function PersonalPage() {
	const { view } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<PersonalFiles
			data={Route.useLoaderData()}
			view={view ?? "inventory"}
			onViewChange={(value) => {
				const next = personalViews.find((tab) => tab.value === value);
				void navigate({
					to: "/app",
					search: {
						view: next?.value === "inventory" ? undefined : next?.value,
					},
					replace: true,
					resetScroll: false,
				});
			}}
		/>
	);
}
