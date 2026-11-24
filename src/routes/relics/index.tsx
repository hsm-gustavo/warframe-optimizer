import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem } from "lucide-react";
import {
	RetroButton,
	RetroInput,
	RetroPanel,
	StatusBar,
} from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { loadRelics } from "#/features/relics/relic-data";

type Search = { q?: string; era?: string; page?: number };
export const Route = createFileRoute("/relics/")({
	validateSearch: (search: Record<string, unknown>): Search => ({
		q: typeof search.q === "string" ? search.q.slice(0, 120) : undefined,
		era: typeof search.era === "string" ? search.era.slice(0, 30) : undefined,
		page:
			typeof search.page === "number" &&
			Number.isInteger(search.page) &&
			search.page > 0 &&
			search.page <= 10000
				? search.page
				: undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadRelics({ data: deps }),
	component: RelicDatabase,
	pendingComponent: () => (
		<p className="workspace-message">Opening relic database…</p>
	),
	head: () => ({ meta: [{ title: "Relic Database | Orbital Field Desk" }] }),
});

function RelicDatabase() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<Window
			title="Relic Database"
			icon={Gem}
			status={
				<StatusBar end={data.stale ? "Last known data" : "WFCD drop tables"}>
					{data.total} relics
				</StatusBar>
			}
		>
			<div className="window-body">
				<h1>Relic Database</h1>
				{!data.observedAt ? (
					<p>Relic data is unavailable. Try again later.</p>
				) : (
					<>
						<form
							key={`${search.q ?? ""}/${search.era ?? ""}`}
							className="optimizer-toolbar phase-toolbar"
							onSubmit={(event) => {
								event.preventDefault();
								const fields = new FormData(event.currentTarget);
								void navigate({
									to: "/relics",
									search: {
										q: String(fields.get("q")).trim() || undefined,
										era: String(fields.get("era")) || undefined,
									},
								});
							}}
						>
							<div className="form-field">
								<label htmlFor="relic-q">Relic or reward</label>
								<RetroInput
									id="relic-q"
									name="q"
									type="search"
									defaultValue={search.q}
									maxLength={120}
								/>
							</div>
							<div className="form-field">
								<label htmlFor="relic-era">Era</label>
								<select
									className="retro-input"
									id="relic-era"
									name="era"
									defaultValue={search.era}
								>
									<option value="">All eras</option>
									{data.eras.map((era) => (
										<option key={era}>{era}</option>
									))}
								</select>
							</div>
							<RetroButton type="submit">Search</RetroButton>
						</form>
						<RetroPanel className="table-scroll">
							{data.items.length ? (
								<table className="retro-table">
									<thead>
										<tr>
											<th scope="col">Relic</th>
											<th scope="col">Era</th>
											{search.q && <th scope="col">Matching rewards</th>}
										</tr>
									</thead>
									<tbody>
										{data.items.map((relic) => (
											<tr key={relic.id}>
												<th scope="row">
													<Link to="/relics/$slug" params={{ slug: relic.id }}>
														{relic.name}
													</Link>
												</th>
												<td>{relic.era}</td>
												{search.q && <td>{relic.matches.join(", ") || "—"}</td>}
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className="empty-state">No relics match this search.</p>
							)}
						</RetroPanel>
						{data.pages > 1 && (
							<div className="catalog-pagination">
								<RetroButton
									disabled={data.page === 1}
									onClick={() =>
										void navigate({
											search: { ...search, page: data.page - 1 },
										})
									}
								>
									Previous
								</RetroButton>
								<span>
									Page {data.page} of {data.pages}
								</span>
								<RetroButton
									disabled={data.page === data.pages}
									onClick={() =>
										void navigate({
											search: { ...search, page: data.page + 1 },
										})
									}
								>
									Next
								</RetroButton>
							</div>
						)}
					</>
				)}
			</div>
		</Window>
	);
}
