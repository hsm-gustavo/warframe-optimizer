import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChartNoAxesCombined, FileText } from "lucide-react";
import { RetroPanel, StatusBar } from "#/components/retro/controls";
import { ItemIcon } from "#/components/retro/item-icon";
import { Window } from "#/components/retro/window";
import { describeSource, getDropChance, prioritizeSources } from "./catalog";
import type { CatalogItem } from "./models";

export function ItemDetails({ item }: { item: CatalogItem }) {
	return (
		<Window
			title={`${item.name} — File Properties`}
			icon={FileText}
			status={
				<StatusBar end={item.dropData ? "WFCD drop tables" : "Sample drops"}>
					Equipment record
				</StatusBar>
			}
		>
			<div className="window-body">
				<Link to="/items" className="back-link">
					<ArrowLeft size={15} aria-hidden="true" /> Item Catalog
				</Link>
				<div className="record-heading">
					<ItemIcon artwork={item.artwork} size="large" />
					<div>
						<h1>{item.name}</h1>
						<p>
							{item.category} <span className="edition">{item.edition}</span>
						</p>
					</div>
					<Link
						to="/optimizer"
						search={{ item: item.slug }}
						className="retro-button primary-action"
					>
						<ChartNoAxesCombined size={16} aria-hidden="true" /> Plan farming
						strategy
					</Link>
				</div>
				<div className="details-layout">
					<section>
						<h2 className="section-caption">Required Prime components</h2>
						<RetroPanel className="table-scroll">
							<table className="retro-table">
								<caption className="sr-only">
									Required Prime components and example sources for {item.name}
								</caption>
								<thead>
									<tr>
										<th scope="col">Component</th>
										<th scope="col">Qty</th>
										<th scope="col">Example source</th>
										<th scope="col">Base chance</th>
									</tr>
								</thead>
								<tbody>
									{item.components.map((part) => {
										const sources = prioritizeSources(
											part.sources,
											"Intact",
										).slice(0, 3);
										return (
											<tr key={part.name}>
												<th scope="row">{part.name}</th>
												<td className="numeric">{part.quantity}</td>
												<td>
													{sources.length
														? sources.map(describeSource).join(", ")
														: "Unavailable"}
												</td>
												<td className="numeric">
													{sources.length
														? sources
																.map((source) => {
																	const chance = getDropChance(
																		source,
																		"Intact",
																	);
																	return chance === undefined
																		? "Unavailable"
																		: `${chance}%`;
																})
																.join(", ")
														: "Unavailable"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</RetroPanel>
						<p className="data-note">
							Up to three relics per component. Chances are per Intact relic
							opened.
						</p>
					</section>
					<section>
						<h2 className="section-caption">Market set price</h2>
						<RetroPanel className="text-panel">
							{item.market ? (
								<>
									<strong>{item.market.platinum} Platinum</strong>
									<p>
										Lowest listed sell order · {item.market.platform} ·{" "}
										<time dateTime={item.market.observedAt}>
											{item.market.observedAt.slice(0, 16).replace("T", " ")}{" "}
											UTC
										</time>
									</p>
								</>
							) : (
								<>
									<strong>Price unavailable</strong>
									<p>No current PC set quote from Warframe.market.</p>
								</>
							)}
						</RetroPanel>
					</section>
				</div>
			</div>
		</Window>
	);
}

export function MissingItem() {
	return (
		<Window title="Item Catalog — File Not Found" icon={FileText}>
			<div className="empty-state">
				<FileText size={30} aria-hidden="true" />
				<h1>Equipment file not found</h1>
				<p>This item is missing from the local sample catalog.</p>
				<Link to="/items" className="retro-button">
					Open Item Catalog
				</Link>
			</div>
		</Window>
	);
}
