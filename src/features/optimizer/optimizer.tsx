import { Link } from "@tanstack/react-router";
import { ChartNoAxesCombined } from "lucide-react";
import { useState } from "react";
import { RetroInput, RetroPanel, StatusBar } from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { dropDataLabel } from "#/features/catalog/catalog";
import {
	type CatalogItem,
	type Refinement,
	refinements,
	rewardName,
} from "#/features/catalog/models";
import { MarketPrices } from "#/features/catalog/prices";
import {
	chanceOfCopies,
	planPart,
	remainingParts,
	type Strategy,
	squadProbability,
	traceCosts,
} from "./planning";

const objectives: Record<Strategy, string> = {
	probability: "Highest reward probability",
	openings: "Fewest expected openings",
	owned: "Prefer owned relics",
	time: "Lowest estimated farming time",
	purchase: "Lowest observed purchase prices",
};

type Stock = {
	parts: readonly { componentId: string; quantity: number }[];
	relics: readonly {
		relicId: string;
		refinement: Refinement;
		quantity: number;
	}[];
};

export function Optimizer({
	items,
	item,
	stock,
	onItemChange,
}: {
	items: readonly Pick<CatalogItem, "slug" | "name">[];
	item: CatalogItem;
	stock?: Stock | null;
	onItemChange: (slug: string) => void;
}) {
	const [strategy, setStrategy] = useState<Strategy>(
		stock ? "owned" : "probability",
	);
	const [refinement, setRefinement] = useState<Refinement | "Any">("Any");
	const [openingTime, setOpeningTime] = useState("");
	const [collectionTime, setCollectionTime] = useState("");
	const [attempts, setAttempts] = useState("10");
	const [squad, setSquad] = useState(["", "", ""]);
	const [useStock, setUseStock] = useState(true);
	const personal = useStock ? stock : null;
	const parts = remainingParts(
		item,
		new Map(
			personal?.parts.map(({ componentId, quantity }) => [
				componentId,
				quantity,
			]),
		),
	);
	const missing = parts.filter((part) => part.missing);
	const duration = (raw: string) =>
		Number(raw) > 0 && Number(raw) <= 240 ? Number(raw) : undefined;
	const openingMinutes = duration(openingTime);
	const collectionMinutes = duration(collectionTime);
	const rewardRolls = Number(attempts);
	const teammates = squad
		.filter((raw) => raw !== "")
		.map((raw) => Number(raw) / 100);

	return (
		<Window
			title="Farming Optimizer — Acquisition Planner"
			icon={ChartNoAxesCombined}
			status={
				<StatusBar end={dropDataLabel(item)}>
					{personal ? "Personalized plan" : "Public plan"}
				</StatusBar>
			}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Farming Optimizer</h1>
					<p>Compare paths to the parts you need.</p>
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
							{items.map((entry) => (
								<option key={entry.slug} value={entry.slug}>
									{entry.name}
								</option>
							))}
						</select>
					</div>
					<div className="form-field">
						<label htmlFor="plan-strategy">Strategy</label>
						<select
							className="retro-input"
							id="plan-strategy"
							value={strategy}
							onChange={(event) => setStrategy(event.target.value as Strategy)}
						>
							{Object.entries(objectives).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
					<div className="form-field">
						<label htmlFor="plan-refinement">Refinement</label>
						<select
							className="retro-input"
							id="plan-refinement"
							value={refinement}
							onChange={(event) =>
								setRefinement(event.target.value as Refinement | "Any")
							}
						>
							<option>Any</option>
							{refinements.map((level) => (
								<option key={level}>{level}</option>
							))}
						</select>
					</div>
					<Link
						to="/items/$slug"
						params={{ slug: item.slug }}
						className="retro-button"
					>
						Inspect item
					</Link>
				</div>
				{stock && (
					<label>
						<input
							type="checkbox"
							checked={useStock}
							onChange={(event) => setUseStock(event.target.checked)}
						/>{" "}
						Include my inventory
					</label>
				)}
				<div className="optimizer-toolbar phase-toolbar">
					<div className="form-field">
						<label htmlFor="reward-rolls">Reward opportunities</label>
						<RetroInput
							id="reward-rolls"
							type="number"
							min={0}
							max={1000}
							step={1}
							value={attempts}
							onChange={(event) => setAttempts(event.target.value)}
						/>
					</div>
					{strategy === "time" && (
						<>
							<div className="form-field">
								<label htmlFor="opening-time">Minutes per relic opening</label>
								<RetroInput
									id="opening-time"
									type="number"
									min={0.1}
									max={240}
									step="any"
									value={openingTime}
									onChange={(event) => setOpeningTime(event.target.value)}
								/>
							</div>
							<div className="form-field">
								<label htmlFor="collection-time">
									Minutes per collection opportunity
								</label>
								<RetroInput
									id="collection-time"
									type="number"
									min={0.1}
									max={240}
									step="any"
									value={collectionTime}
									onChange={(event) => setCollectionTime(event.target.value)}
								/>
							</div>
						</>
					)}
				</div>
				<details className="phase-toolbar">
					<summary>Squad reward odds</summary>
					<p className="data-note">
						Enter each teammate’s chance for the same target part. Leave unused
						rolls blank. Squad inputs affect the probability column only.
					</p>
					<div className="optimizer-toolbar">
						{squad.map((value, index) => {
							const id = `teammate-${index + 1}`;
							return (
								<div className="form-field" key={id}>
									<label htmlFor={id}>Teammate {index + 1} chance (%)</label>
									<RetroInput
										id={id}
										type="number"
										min={0}
										max={100}
										step="any"
										value={value}
										onChange={(event) =>
											setSquad((previous) =>
												previous.map((entry, i) =>
													i === index ? event.target.value : entry,
												),
											)
										}
									/>
								</div>
							);
						})}
					</div>
				</details>
				{strategy === "time" && (
					<p className="data-note">
						Time ranking uses your durations for both openings and reported
						collection rolls. It accounts for relics already owned when
						inventory is enabled. It excludes time to earn Void Traces.
					</p>
				)}
				{personal && (
					<p className="data-note">
						{strategy === "owned" && "Owned relics rank first. "}Each part is
						evaluated independently. Shared relics are shown for each possible
						use and are never reserved by the planner.
					</p>
				)}
				{strategy === "purchase" && (
					<p className="data-note">
						The purchase comparison uses the lowest observed PC offer for each
						missing component. Farming alternatives below are sorted by expected
						openings.
					</p>
				)}
				{!parts.length ? (
					<p className="empty-state">
						No Prime recipe components are published for this item.
					</p>
				) : !missing.length ? (
					<p className="empty-state">You own all required Prime parts.</p>
				) : (
					missing.map((part) => {
						const options = planPart(
							part,
							personal?.relics ?? [],
							strategy,
							refinement,
							openingMinutes,
							collectionMinutes,
						);
						return (
							<section key={part.id} className="phase-toolbar">
								<h2 className="section-caption">
									{part.name} · {part.missing} missing of {part.quantity}
								</h2>
								<Link
									className="back-link"
									to="/relics"
									search={{ q: rewardName(item, part) }}
								>
									Browse all relics for this part
								</Link>
								{!options.length ? (
									<p className="data-note">
										No comparable relic options.{" "}
										{strategy === "time" &&
											"Enter both durations and check for reported mission sources."}
									</p>
								) : (
									<RetroPanel className="table-scroll">
										<table className="retro-table">
											<thead>
												<tr>
													<th scope="col">Relic</th>
													<th scope="col">Solo drop</th>
													<th scope="col">Chance for {part.missing}</th>
													<th scope="col">Expected openings</th>
													<th scope="col">Collection</th>
												</tr>
											</thead>
											<tbody>
												{options.slice(0, 4).map((option, index) => {
													const probability = squadProbability([
														option.probability,
														...teammates,
													]);
													const chance =
														probability !== undefined && rewardRolls <= 1000
															? chanceOfCopies(
																	probability,
																	rewardRolls,
																	part.missing,
																)
															: undefined;
													const ownedChance =
														personal && option.owned > 0
															? chanceOfCopies(
																	probability ?? option.probability,
																	Math.min(option.owned, 9999),
																	part.missing,
																)
															: undefined;
													return (
														<tr
															key={`${option.source.relic.name}/${option.level}`}
														>
															<th scope="row">
																{option.source.relic.id ? (
																	<Link
																		to="/relics/$slug"
																		params={{ slug: option.source.relic.id }}
																	>
																		{option.source.relic.name}
																	</Link>
																) : (
																	option.source.relic.name
																)}
																<small className="relic-node">
																	{option.level}
																	{index === 0 && " · First choice"}
																	{personal && ` · ${option.owned} owned`}
																</small>
															</th>
															<td>{(option.probability * 100).toFixed(2)}%</td>
															<td>
																{chance === undefined
																	? "—"
																	: `${(chance * 100).toFixed(1)}%`}
																{ownedChance !== undefined && (
																	<small className="relic-node">
																		{(ownedChance * 100).toFixed(1)}% with stock
																	</small>
																)}
															</td>
															<td>
																{option.openings.toFixed(1)}
																<small className="relic-node">
																	{traceCosts[option.level]} Traces from Intact
																	per relic
																</small>
															</td>
															<td>
																{option.mission ? (
																	<>
																		{option.mission.location}
																		{option.mission.rotation &&
																			` · Rot. ${option.mission.rotation}`}
																		<small className="relic-node">
																			{option.mission.probability}% relic chance
																			· {option.acquisitionAttempts?.toFixed(1)}{" "}
																			expected collection rolls
																			{option.owned > 0
																				? " after stock"
																				: " from scratch"}
																		</small>
																	</>
																) : (
																	"Mission source unknown"
																)}
																{option.totalMinutes !== undefined && (
																	<small className="relic-node">
																		{option.totalMinutes.toFixed(0)} min total
																		estimate
																	</small>
																)}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</RetroPanel>
								)}
							</section>
						);
					})
				)}
				<p className="data-note">
					The first option follows the selected strategy. Expected openings use
					solo odds and assume relics are in hand. Collecting relics is
					estimated separately. All results are averages or probabilities, and
					squad rolls assume independent rewards and one selected reward per
					opening.
				</p>
				<div className="phase-toolbar">
					<MarketPrices slug={item.slug} parts={parts} />
				</div>
			</div>
		</Window>
	);
}
