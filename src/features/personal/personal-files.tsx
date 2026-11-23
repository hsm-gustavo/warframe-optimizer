import { Link } from "@tanstack/react-router";
import { Archive, Box, Heart, History } from "lucide-react";
import { RetroTabs, StatusBar } from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { authClient } from "#/lib/auth-client";

export const personalViews = [
	{
		value: "inventory",
		label: "Inventory",
		icon: Box,
		empty: "No inventory records",
		note: "Owned components and relics will appear here.",
		link: "/items",
		action: "Browse components",
	},
	{
		value: "wishlist",
		label: "Wishlist",
		icon: Heart,
		empty: "No wishlist entries",
		note: "Equipment you want to farm will appear here.",
		link: "/items",
		action: "Browse equipment",
	},
	{
		value: "history",
		label: "Farming History",
		icon: History,
		empty: "No farming history",
		note: "Your past farming sessions will appear here.",
		link: "/optimizer",
		action: "Open Optimizer",
	},
] as const;

export function PersonalFiles({
	view,
	onViewChange,
}: {
	view: string;
	onViewChange: (view: string) => void;
}) {
	const { data: session, isPending, error } = authClient.useSession();
	const sessionStatus = isPending
		? "Checking session…"
		: error
			? "Session unavailable"
			: session?.user
				? `Signed in as ${session.user.name || session.user.email}`
				: "Guest preview";

	return (
		<Window
			title="Personal Files"
			icon={Archive}
			status={
				<StatusBar end="Saving pending">
					<span aria-live="polite">{sessionStatus}</span>
				</StatusBar>
			}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Personal Files</h1>
					<p>
						The sign-in screen and saved progress are pending. You can preview
						the personal workspace here.
					</p>
				</div>
				<RetroTabs
					label="Personal files"
					value={view}
					onValueChange={onViewChange}
					tabs={personalViews.map(({ icon: Icon, ...tab }) => ({
						...tab,
						content: (
							<div className="empty-state">
								<Icon size={30} aria-hidden="true" />
								<h2>{tab.empty}</h2>
								<p>{tab.note}</p>
								<Link to={tab.link} className="retro-button">
									{tab.action}
								</Link>
							</div>
						),
					}))}
				/>
			</div>
		</Window>
	);
}
