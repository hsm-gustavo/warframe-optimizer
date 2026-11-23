import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Desktop } from "#/components/retro/desktop";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ title: "Orbital Field Desk | Warframe Farming Optimizer" },
			],
			links: [
				{ rel: "stylesheet", href: appCss },
				{ rel: "icon", type: "image/svg+xml", href: "/field-desk.svg" },
			],
		}),
		component: Desktop,
		shellComponent: RootDocument,
	},
);

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<a className="skip-link" href="#workspace">
					Skip to workspace
				</a>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
