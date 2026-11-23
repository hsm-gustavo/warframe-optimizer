import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

export function WindowTitleBar({
	title,
	id,
	icon: Icon,
	controls,
}: {
	title: string;
	id: string;
	icon: LucideIcon;
	controls?: ReactNode;
}) {
	return (
		<header className="window-title">
			<Icon size={15} aria-hidden="true" />
			<div className="window-label" id={id}>
				{title}
			</div>
			{controls && <div className="window-controls">{controls}</div>}
		</header>
	);
}

export function Window({
	title,
	icon,
	className = "",
	status,
	controls,
	children,
}: {
	title: string;
	icon: LucideIcon;
	className?: string;
	status?: ReactNode;
	controls?: ReactNode;
	children: ReactNode;
}) {
	const id = useId();

	return (
		<section className={`retro-window ${className}`} aria-labelledby={id}>
			<WindowTitleBar title={title} icon={icon} id={id} controls={controls} />
			{children}
			{status}
		</section>
	);
}
