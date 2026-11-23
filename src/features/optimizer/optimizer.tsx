import { Link } from "@tanstack/react-router";
import { ChartNoAxesCombined } from "lucide-react";
import { useState } from "react";
import { RetroPanel, StatusBar } from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { describeSource, getDropChance } from "#/features/catalog/catalog";
import {
	type CatalogItem,
	type Component,
	type DropSource,
	type Refinement,
	refinements,
} from "#/features/catalog/models";

export function Optimizer({
	items,
	item,
	onItemChange,
}: {
	items: readonly CatalogItem[];
	item: CatalogItem;
	onItemChange: (slug: string) => void;
}) {
	const [refinement, setRefinement] = useState<Refinement>("Intact");
	const rows = item.components.flatMap<{
		component: Component;
		source?: DropSource;
	}>((component) =>
		component.sources.length
			? component.sources.map((source) => ({ component, source }))
			: [{ component }],
	);

	return (
		<Window
			title="Farming Optimizer — Acquisition Planner"
			icon={ChartNoAxesCombined}
			status={
				<StatusBar end="Sample data">
					{item.components.length} component types · {refinement}
				</StatusBar>
			}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Farming Optimizer</h1>
					<p>
						Compare component sources and relic refinements for your next farm.
					</p>
				</div>
				<div className="optimizer-toolbar">
					<div className="form-field">
						<label htmlFor="plan-item">Equipment</label>
						<select
							className="retro-input"
							id="plan-item"
							value={item.slug}
							onChange={(event) => onItemChange(event.target.value)}
						>
							{items.map((option) => (
								<option key={option.slug} value={option.slug}>
									{option.name}
								</option>
							))}
						</select>
					</div>
					<div className="form-field">
						<label htmlFor="plan-refinement">Relic refinement</label>
						<select
							className="retro-input"
							id="plan-refinement"
							value={refinement}
							onChange={(event) => {
								const value = refinements.find(
									(level) => level === event.target.value,
								);
								if (value) setRefinement(value);
							}}
						>
							{refinements.map((level) => (
								<option key={level}>{level}</option>
							))}
						</select>
					</div>
					<Link
						className="retro-button"
						to="/items/$slug"
						params={{ slug: item.slug }}
					>
						Inspect item
					</Link>
				</div>
				<h2 className="section-caption">Acquisition comparison</h2>
				<RetroPanel className="table-scroll">
					<table className="retro-table">
						<caption className="sr-only">
							Acquisition sources for {item.name} at {refinement} refinement
						</caption>
						<thead>
							<tr>
								<th scope="col">Component</th>
								<th scope="col">Source</th>
								<th scope="col">Drop chance</th>
								<th scope="col">Avg. relics per drop</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(({ component, source }) => {
								const chance = source && getDropChance(source, refinement);
								const estimate =
									source?.kind === "relic" &&
									chance &&
									(100 / chance).toFixed(1);

								return (
									<tr
										key={`${component.name}/${source ? describeSource(source) : ""}`}
									>
										<th scope="row">
											{component.name} <small>×{component.quantity}</small>
										</th>
										<td>
											{source ? (
												<>
													{describeSource(source)}{" "}
													{source.kind === "relic" && (
														<small>· {source.rarity}</small>
													)}
												</>
											) : (
												"Unavailable"
											)}
										</td>
										<td className="numeric">
											{chance === undefined ? "Unavailable" : `${chance}%`}
										</td>
										<td className="numeric">{estimate || "Unavailable"}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</RetroPanel>
				<p className="data-note">
					Estimates use the chance of a single relic reward and exclude squad
					rewards and time to acquire relics. The sample list may include
					vaulted relics.
				</p>
				<div className="comparison-footer">
					<RetroPanel className="text-panel">
						<h2>Market price</h2>
						<p>
							{item.market
								? `${item.market.platinum} Platinum · ${item.market.platform}`
								: "Unavailable · live market feed pending"}
						</p>
					</RetroPanel>
					<RetroPanel className="text-panel">
						<h2>Farm or buy?</h2>
						<p>
							A recommendation needs current prices and relic acquisition data.
						</p>
					</RetroPanel>
				</div>
			</div>
		</Window>
	);
}
