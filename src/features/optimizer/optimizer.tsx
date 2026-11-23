import { Link } from "@tanstack/react-router";
import { ChartNoAxesCombined } from "lucide-react";
import { useState } from "react";
import { RetroInput, RetroPanel, StatusBar } from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import {
	describeSource,
	getDropChance,
	prioritizeSources,
} from "#/features/catalog/catalog";
import {
	type CatalogItem,
	type Component,
	type DropSource,
	type Refinement,
	refinements,
} from "#/features/catalog/models";

import { ComponentPrices } from "./component-prices";

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
	const [openingValue, setOpeningValue] = useState("");
	const openingCosts = item.components.map((component) => {
		const bestChance = Math.max(
			0,
			...component.sources.map((source) =>
				source.kind === "relic" && source.relic.missionDrop
					? (getDropChance(source, refinement) ?? 0)
					: 0,
			),
		);
		return bestChance ? (component.quantity * 100) / bestChance : undefined;
	});
	const totalOpenings =
		item.dropData && openingCosts.every((cost) => cost !== undefined)
			? openingCosts.reduce<number>((sum, cost) => sum + (cost ?? 0), 0)
			: undefined;
	const value = Number(openingValue);
	const comparison =
		totalOpenings !== undefined &&
		openingValue !== "" &&
		Number.isFinite(value) &&
		value >= 0
			? totalOpenings * value
			: undefined;
	const market = item.market;
	const rows = item.components.flatMap<{
		component: Component;
		source?: DropSource;
	}>((component) =>
		component.sources.length
			? prioritizeSources(component.sources, refinement)
					.slice(0, 3)
					.map((source) => ({ component, source }))
			: [{ component }],
	);

	return (
		<Window
			title="Farming Optimizer — Acquisition Planner"
			icon={ChartNoAxesCombined}
			status={
				<StatusBar end={item.dropData ? "WFCD drop tables" : "Sample drops"}>
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
														<>
															{source.rarity && (
																<small>· {source.rarity}</small>
															)}
															{source.relic.missionDrop && (
																<small className="relic-node">
																	{source.relic.missionDrop.location}
																	{source.relic.missionDrop.rotation &&
																		` · Rot. ${source.relic.missionDrop.rotation}`}
																	{` · ${source.relic.missionDrop.probability}% relic drop`}
																</small>
															)}
														</>
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
					Up to three relics per component, with reported mission drops first.
					Opening estimates use one reward roll and exclude squad rewards and
					time to collect relics.
				</p>
				<div className="comparison-footer">
					<RetroPanel className="text-panel">
						<h2>Market set price</h2>
						<p>
							{market
								? `${market.platinum} Platinum · ${market.platform} · lowest listed sell order`
								: "Current PC set quote unavailable."}
						</p>
						{market && (
							<p className="data-note">
								Observed{" "}
								<time dateTime={market.observedAt}>
									{market.observedAt.slice(0, 16).replace("T", " ")} UTC
								</time>
							</p>
						)}
					</RetroPanel>
					<RetroPanel className="text-panel">
						<h2>Farm or buy?</h2>
						{market && totalOpenings !== undefined ? (
							<>
								<p>
									With the required relics on hand, farming the set takes an
									estimated {totalOpenings.toFixed(1)} openings.
								</p>
								<div className="form-field comparison-value">
									<label htmlFor="opening-value">
										Value of one opening in Platinum
									</label>
									<RetroInput
										id="opening-value"
										type="number"
										min="0"
										step="any"
										value={openingValue}
										onChange={(event) => setOpeningValue(event.target.value)}
									/>
								</div>
								<output htmlFor="opening-value">
									{comparison !== undefined &&
										(Math.abs(comparison - market.platinum) < 0.05
											? "Farm and buy costs are about equal."
											: `${comparison < market.platinum ? "Farm" : "Buy"} at your rate. Farming costs about ${comparison.toFixed(1)} Platinum in opening time.`)}
								</output>
							</>
						) : (
							<p>
								A recommendation needs a market set quote and a reported relic
								mission source for every component.
							</p>
						)}
					</RetroPanel>
				</div>
				<ComponentPrices
					key={item.slug}
					item={item}
					openingCosts={openingCosts}
				/>
			</div>
		</Window>
	);
}
