import { Link, useNavigate } from "@tanstack/react-router";
import { Database, FolderOpen, Monitor } from "lucide-react";
import {
	RetroButton,
	RetroInput,
	RetroPanel,
	StatusBar,
} from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import type { loadCatalog } from "#/features/catalog/item-data";
import type { loadDesktopGoals } from "#/features/personal/personal-data";
import type { loadRelicFeedStatus } from "#/features/relics/relic-data";
import { useRecentItems } from "./recent";

export function Home({
	catalog,
	goals,
	relicFeed,
}: {
	catalog: Pick<
		Awaited<ReturnType<typeof loadCatalog>>,
		"source" | "observedAt"
	> & { count: number };
	goals: Awaited<ReturnType<typeof loadDesktopGoals>>;
	relicFeed: Awaited<ReturnType<typeof loadRelicFeedStatus>>;
}) {
	const recent = useRecentItems();
	const navigate = useNavigate();
	return (
		<div className="home-layout">
			<Window
				title="Field Desk"
				icon={Monitor}
				status={<StatusBar>Prime equipment search</StatusBar>}
			>
				<div className="window-body">
					<h1>Orbital Field Desk</h1>
					<form
						className="optimizer-toolbar phase-toolbar"
						onSubmit={(event) => {
							event.preventDefault();
							const q = String(
								new FormData(event.currentTarget).get("q"),
							).trim();
							void navigate({ to: "/items", search: { q: q || undefined } });
						}}
					>
						<div className="form-field catalog-search">
							<label htmlFor="quick-equipment">Find Prime equipment</label>
							<RetroInput
								id="quick-equipment"
								name="q"
								type="search"
								maxLength={120}
								placeholder="Search equipment"
							/>
						</div>
						<RetroButton type="submit" className="primary-action">
							Search catalog
						</RetroButton>
					</form>
					<div className="action-row">
						<Link to="/items" className="retro-button">
							<FolderOpen size={16} aria-hidden="true" /> Item Catalog
						</Link>
						<Link to="/relics" className="retro-button">
							Relic Database
						</Link>
						<Link to="/optimizer" className="retro-button">
							Optimizer
						</Link>
						<Link to="/app" className="retro-button">
							Personal Files
						</Link>
					</div>
					<h2 className="section-caption phase-toolbar">Recently viewed</h2>
					{recent.length ? (
						<RetroPanel className="text-panel">
							<ul className="price-list">
								{recent.map((item) => (
									<li key={item.slug}>
										<Link
											to="/items/$slug"
											params={{ slug: item.slug }}
											preload={false}
										>
											{item.name}
										</Link>
									</li>
								))}
							</ul>
						</RetroPanel>
					) : (
						<p className="data-note">
							Equipment you inspect appears here on this device.
						</p>
					)}
					{goals.length > 0 && (
						<>
							<h2 className="section-caption phase-toolbar">
								Active farming goals
							</h2>
							<RetroPanel className="text-panel">
								<ul className="price-list">
									{goals.map((goal) => (
										<li key={goal.slug}>
											<Link to="/optimizer" search={{ item: goal.slug }}>
												{goal.name}
											</Link>{" "}
											·{" "}
											{goal.progress === undefined
												? "Progress unavailable"
												: `${goal.progress}% of required parts owned`}
										</li>
									))}
								</ul>
							</RetroPanel>
						</>
					)}
				</div>
			</Window>
			<Window title="Data Sources" icon={Database} className="utility-window">
				<div className="window-body">
					<RetroPanel className="source-list">
						<div>
							<span
								className={`lamp ${catalog.source === "wfcd" ? "" : "lamp-amber"}`}
							/>
							<span>Equipment</span>
							<strong>
								{catalog.source === "wfcd"
									? `${catalog.count} records`
									: catalog.source === "stale"
										? "Last known"
										: catalog.source === "sample"
											? "Development fixtures"
											: "Unavailable"}
							</strong>
						</div>
						<div>
							<span className="lamp" />
							<span>Relic tables</span>
							<Link to="/relics">
								{!relicFeed.observedAt
									? "Unavailable"
									: relicFeed.stale
										? "Last known"
										: "Current"}
							</Link>
						</div>
						<div>
							<span className="lamp" />
							<span>Market listings</span>
							<strong>On demand</strong>
						</div>
					</RetroPanel>
					{catalog.observedAt && (
						<p className="data-note">
							Equipment sync{" "}
							<time dateTime={catalog.observedAt}>
								{catalog.observedAt.slice(0, 16).replace("T", " ")} UTC
							</time>
						</p>
					)}
				</div>
			</Window>
		</div>
	);
}
