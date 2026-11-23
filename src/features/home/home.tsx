import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ChartNoAxesCombined,
	Database,
	FolderOpen,
	HardDrive,
	Info,
	Monitor,
} from "lucide-react";
import { RetroPanel, StatusBar } from "#/components/retro/controls";
import { ItemIcon } from "#/components/retro/item-icon";
import { Window } from "#/components/retro/window";
import { listItems } from "#/features/catalog/catalog";

function ArchiveIllustration() {
	return (
		<div className="archive-art" aria-hidden="true">
			<svg aria-hidden="true" viewBox="0 0 196 152" fill="none">
				<ellipse
					cx="99"
					cy="122"
					rx="60"
					ry="13"
					fill="#466866"
					opacity=".18"
				/>
				<path d="m40 65 56-31 61 30v41l-57 32-60-31z" fill="#334b4c" />
				<path
					d="m40 65 60 31 57-32-61-30z"
					fill="#b5c7ba"
					stroke="#314a4b"
					strokeWidth="2"
				/>
				<path
					d="M40 65v41l60 31V96zm60 31v41l57-32V64z"
					fill="#627c74"
					stroke="#314a4b"
					strokeWidth="2"
				/>
				<path d="m45 73 50 26v29l-50-25z" fill="#8ba396" stroke="#b5c7ba" />
				<path d="m105 100 47-28v29l-47 27z" fill="#536d65" stroke="#839c8a" />
				<path d="m56 86 30 16v10L56 96z" fill="#263c45" stroke="#c7d2bb" />
				<path d="m63 94 16 8m-16-4 16 8" stroke="#93bbb1" />
				<path d="m132 95 13-8v7l-13 8z" fill="#e8c087" stroke="#364d4c" />
				<path d="m54 63 42-23 45 24-42 23z" fill="#7a9691" stroke="#536f6d" />
				<path
					d="M74 45 98 14l26 31-8 26-17 9-18-10z"
					fill="#365b66"
					stroke="#2b454d"
					strokeWidth="2"
				/>
				<path d="m98 14 4 35-28-4zm0 0 26 31-22 4z" fill="#b4d4d0" />
				<path d="m74 45 28 4-3 31-18-10zm28 4 22-4-8 26-17 9z" fill="#6d9d9f" />
				<path d="m98 14 4 35-3 31m-25-35 28 4 22-4" stroke="#d8e6d6" />
				<path
					d="M17 23h15m-15 0v15m162-15h-15m15 0v15M17 130h15m-15 0v-15m162 15h-15m15 0v-15"
					stroke="#547c7b"
				/>
			</svg>
		</div>
	);
}

export function Home() {
	const items = listItems();
	const featured = items.slice(0, 3);

	return (
		<div className="home-layout">
			<Window
				title="Field Desk — Welcome"
				icon={Monitor}
				className="welcome-window"
				status={
					<StatusBar end="Public workspace">
						<span className="lamp" /> Ready
					</StatusBar>
				}
			>
				<div className="window-body welcome-body">
					<div className="welcome-overview">
						<ArchiveIllustration />
						<div className="welcome-copy">
							<h1>Warframe Farming Optimizer</h1>
							<p>
								Find Prime components, inspect their relic drops, and compare
								your options before your next Void Fissure.
							</p>
							<div className="welcome-actions">
								<Link to="/items" className="retro-button primary-action">
									<FolderOpen size={16} aria-hidden="true" /> Open Item Catalog
								</Link>
								<Link to="/optimizer" className="retro-button">
									<ChartNoAxesCombined size={16} aria-hidden="true" /> Run
									Optimizer
								</Link>
							</div>
						</div>
					</div>
					<div className="section-caption">
						<HardDrive size={14} aria-hidden="true" />
						<h2>Featured files</h2>
					</div>
					<RetroPanel className="featured-files">
						{featured.map((item) => (
							<Link
								to="/items/$slug"
								params={{ slug: item.slug }}
								key={item.slug}
								className="featured-file"
							>
								<ItemIcon artwork={item.artwork} />
								<span>
									<strong>{item.name}</strong>
									<small>{item.category}</small>
								</span>
								<ArrowRight
									className="file-arrow"
									size={13}
									aria-hidden="true"
								/>
							</Link>
						))}
					</RetroPanel>
				</div>
			</Window>
			<div className="home-aside">
				<Window title="Data Sources" icon={Database} className="utility-window">
					<div className="window-body">
						<RetroPanel className="source-list">
							<div>
								<span className="lamp" />
								<span>Item catalog</span>
								<strong>Sample</strong>
							</div>
							<div>
								<span className="lamp lamp-amber" />
								<span>Live drop tables</span>
								<strong>WFCD</strong>
							</div>
							<div>
								<span className="lamp lamp-amber" />
								<span>Market prices</span>
								<strong>PC quotes</strong>
							</div>
						</RetroPanel>
						<p className="utility-note">
							{items.length} equipment records in the local sample catalog.
						</p>
					</div>
				</Window>
				<Window title="Field Notes" icon={Info} className="utility-window">
					<div className="window-body field-note">
						<Info size={20} aria-hidden="true" />
						<div>
							<strong>Compare relic refinements</strong>
							<p>
								Open Burston Prime in the optimizer to see how refinement
								changes the chance of a common reward.
							</p>
							<Link to="/optimizer" search={{ item: "burston-prime" }}>
								Open Burston comparison{" "}
								<ArrowRight size={13} aria-hidden="true" />
							</Link>
						</div>
					</div>
				</Window>
			</div>
		</div>
	);
}
