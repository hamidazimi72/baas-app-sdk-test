import type { StatusBadgeSize, StatusBadgeTone, StatusBadgeVariant } from '../status-badge/status-badge';
import { StatusBadge } from '../status-badge/status-badge';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = 'LOW' | 'NORMAL' | 'HIGH';

export type PriorityBadgeProps = {
	boxProps?: React.ComponentProps<'span'>;
	//
	priority: Priority;
	size?: StatusBadgeSize;
	variant?: StatusBadgeVariant;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const config: Record<Priority, { label: string; tone: StatusBadgeTone }> = {
	LOW: { label: 'کم', tone: 'neutral' },
	NORMAL: { label: 'عادی', tone: 'info' },
	HIGH: { label: 'زیاد', tone: 'warning' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
	boxProps,
	//
	priority,
	size = 'md',
	variant = 'soft',
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const cfg = config[priority] ?? { label: String(priority), tone: 'neutral' as StatusBadgeTone };

	// ─── Render ───────────────────────────────────────────────────────────────

	return <StatusBadge boxProps={boxProps} tone={cfg.tone} label={cfg.label} size={size} variant={variant} dot />;
};
