import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Gem } from "lucide-react";
import { RetroPanel, StatusBar } from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { refinements } from "#/features/catalog/models";
import { loadRelic } from "#/features/relics/relic-data";

export const Route = createFileRoute("/relics/$slug")({
	loader: async ({ params }) => {
		const data = await loadRelic({ data: params.slug });
		if (!data.relic && data.observedAt) throw notFound();
		return data;
	},
	component: RelicDetails,
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.relic?.name ?? "Relic"} | Orbital Field Desk` },
		],
	}),
});

function RelicDetails() {
	const { relic, stale } = Route.useLoaderData();
	return (
		<Window
			title={relic?.name ?? "Relic Database"}
			icon={Gem}
			status={
				<StatusBar>
					{stale ? "Last known WFCD data" : "Relic properties"}
				</StatusBar>
			}
		>
			<div className="window-body">
				<Link to="/relics" className="back-link">
					Relic Database
				</Link>
				{!relic ? (
					<p>Relic data is unavailable. Try again later.</p>
				) : (
					<>
						<div className="record-heading">
							<div>
								<h1>{relic.name}</h1>
								<p>
									{relic.availability === "reported"
										? "Mission source reported"
										: "Availability unknown"}
								</p>
							</div>
							<Link
								className="retro-button"
								to="/app"
								search={{ view: "relics", pick: relic.id }}
							>
								Track relic
							</Link>
						</div>
						<h2 className="section-caption">Reward probabilities</h2>
						<RetroPanel className="table-scroll">
							<table className="retro-table">
								<thead>
									<tr>
										<th scope="col">Reward</th>
										{refinements.map((level) => (
											<th scope="col" key={level}>
												{level}
											</th>
										))}
										<th scope="col">Ducats</th>
									</tr>
								</thead>
								<tbody>
									{relic.rewards.map((reward) => (
										<tr key={reward.name}>
											<th scope="row">
												{reward.equipment ? (
													<Link
														to="/items/$slug"
														params={{ slug: reward.equipment }}
													>
														{reward.name}
													</Link>
												) : (
													reward.name
												)}
											</th>
											{refinements.map((level) => (
												<td key={level}>
													{reward.probabilities[level] === undefined
														? "—"
														: `${reward.probabilities[level]}%`}
												</td>
											))}
											<td>{reward.ducats ?? "—"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</RetroPanel>
						<h2 className="section-caption phase-toolbar">
							Reported mission sources
						</h2>
						{relic.missions.length ? (
							<RetroPanel className="table-scroll">
								<table className="retro-table">
									<thead>
										<tr>
											<th scope="col">Mission</th>
											<th scope="col">Rotation</th>
											<th scope="col">Relic chance</th>
										</tr>
									</thead>
									<tbody>
										{relic.missions.map((mission) => (
											<tr key={`${mission.location}/${mission.rotation}`}>
												<th scope="row">
													{mission.location}
													{mission.event ? " (event)" : ""}
												</th>
												<td>{mission.rotation ?? "—"}</td>
												<td>{mission.probability}%</td>
											</tr>
										))}
									</tbody>
								</table>
							</RetroPanel>
						) : (
							<p>
								No matching mission sources were reported. Relic availability is
								unknown.
							</p>
						)}
					</>
				)}
			</div>
		</Window>
	);
}
