import { Link, Outlet } from "@tanstack/react-router";
import {
	Archive,
	ChartNoAxesCombined,
	FolderOpen,
	Monitor,
} from "lucide-react";

const programs = [
	{ to: "/", label: "Desktop", icon: Monitor, color: "mint" },
	{ to: "/items", label: "Item Catalog", icon: FolderOpen, color: "gold" },
	{
		to: "/optimizer",
		label: "Optimizer",
		icon: ChartNoAxesCombined,
		color: "blue",
	},
	{ to: "/app", label: "Personal Files", icon: Archive, color: "lavender" },
] as const;

export function ShortcutLauncher() {
	return (
		<nav aria-label="Desktop shortcuts" className="desktop-shortcuts">
			{programs.slice(1).map(({ to, label, icon: Icon, color }) => (
				<Link to={to} key={to} className="shortcut">
					<span className={`shortcut-icon shortcut-icon--${color}`}>
						<Icon size={26} aria-hidden="true" />
					</span>
					<span>{label}</span>
				</Link>
			))}
		</nav>
	);
}

export function Taskbar() {
	return (
		<footer className="taskbar">
			<nav aria-label="Taskbar" className="taskbar-programs">
				{programs.map(({ to, label, icon: Icon, color }) => (
					<Link
						to={to}
						key={to}
						activeOptions={{ exact: to === "/", includeSearch: false }}
						className={`retro-button taskbar-button taskbar-button--${color}`}
					>
						<Icon size={16} aria-hidden="true" />
						<span>{label}</span>
					</Link>
				))}
			</nav>
			<div className="taskbar-tray">
				<span className="lamp" /> Field Desk
			</div>
		</footer>
	);
}

export function Desktop() {
	return (
		<div className="terminal">
			<header className="terminal-header">
				<div className="terminal-brand">
					<Monitor size={17} aria-hidden="true" />{" "}
					<span>ORBITAL FIELD DESK</span>
				</div>
				<span className="terminal-label">WARFRAME FARMING OPTIMIZER</span>
			</header>
			<div className="desktop">
				<ShortcutLauncher />
				<main className="workspace" id="workspace" tabIndex={-1}>
					<Outlet />
				</main>
			</div>
			<Taskbar />
		</div>
	);
}
