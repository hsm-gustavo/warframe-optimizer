import { useState } from "react";
import { RetroButton, RetroPanel } from "#/components/retro/controls";
import { loadComponentQuotes } from "#/features/catalog/item-data";
import type { CatalogItem } from "#/features/catalog/models";

type ComponentQuote = Awaited<ReturnType<typeof loadComponentQuotes>>[number];

export function ComponentPrices({
	item,
	openingCosts,
}: {
	item: CatalogItem;
	openingCosts: readonly (number | undefined)[];
}) {
	const [quotes, setQuotes] = useState<ComponentQuote[]>();
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	async function load() {
		setBusy(true);
		setFailed(false);
		try {
			setQuotes(await loadComponentQuotes({ data: item.slug }));
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="component-prices">
			<div className="component-price-toolbar">
				<h2 className="section-caption">Buy components individually</h2>
				<RetroButton disabled={busy} onClick={() => void load()}>
					{busy
						? "Loading PC quotes…"
						: quotes
							? "Refresh component prices"
							: "Load component prices"}
				</RetroButton>
			</div>
			{failed && (
				<p className="form-message" role="alert">
					Component prices could not be loaded. Try again.
				</p>
			)}
			{quotes && (
				<RetroPanel className="table-scroll">
					<table className="retro-table">
						<caption className="sr-only">
							PC market listings and farming effort by component
						</caption>
						<thead>
							<tr>
								<th scope="col">Component</th>
								<th scope="col">Needed</th>
								<th scope="col">Platinum per unit</th>
								<th scope="col">Avg. openings for needed quantity</th>
							</tr>
						</thead>
						<tbody>
							{item.components.map((part, index) => {
								const quote = quotes.find(
									(entry) => entry.name === part.name,
								)?.quote;
								return (
									<tr key={part.name}>
										<th scope="row">{part.name}</th>
										<td className="numeric">{part.quantity}</td>
										<td className="numeric">
											{quote?.platinum ?? "Unavailable"}
										</td>
										<td className="numeric">
											{openingCosts[index]?.toFixed(1) ?? "Unavailable"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</RetroPanel>
			)}
			{quotes && (
				<p className="data-note">
					Prices are the lowest listed PC sell orders per unit. Opening
					estimates use relics with a reported mission source.
				</p>
			)}
		</section>
	);
}
