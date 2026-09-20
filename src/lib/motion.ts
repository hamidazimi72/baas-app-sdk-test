import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

/**
 * Centralized motion system — the single source of truth for every framer-motion
 * easing, transition, variant and gesture used across atoms, templates and pages.
 *
 * Principles
 *  • GPU-only: variants animate `transform` (x / y / scale / rotate) and `opacity` —
 *    never layout-thrashing props (the lone exception is `expandHeight`, documented inline).
 *  • Factory-first: complex variants are functions taking `(delay, duration, distance, ease)`
 *    with sensible defaults, so call sites stay terse but fully customizable.
 *  • Shared feel: easings mirror the CSS tokens in `assets/styles/theme/media.css`
 *    (`--ease-premium` / `--ease-bounce`) so CSS- and JS-driven motion match exactly.
 *  • Discoverable: flat exports for convenience + grouped namespaces (`fades`, `slides`,
 *    `scales`, `containers`, `interactions`, `pages`, `transitions`) for autocompletion.
 */

// ─── Easings ──────────────────────────────────────────────────────────────────────

export type Bezier = [number, number, number, number];

export const EASE: Bezier = [0.22, 1, 0.36, 1]; // premium ease-out (easeOutQuint) ↔ --ease-premium
export const EASE_OUT: Bezier = [0.16, 1, 0.3, 1]; // soft ease-out (easeOutExpo)
export const EASE_IN_OUT: Bezier = [0.4, 0, 0.2, 1]; // material standard
export const EASE_BACK: Bezier = [0.34, 1.56, 0.64, 1]; // subtle overshoot ↔ --ease-bounce

export const easings = {
	premium: EASE,
	out: EASE_OUT,
	inOut: EASE_IN_OUT,
	bounce: EASE_BACK,
} as const;

export type EasingKey = keyof typeof easings;

// ─── Durations (seconds) ────────────────────────────────────────────────────────────

export const DURATION = {
	instant: 0.12,
	fast: 0.18,
	base: 0.3,
	slow: 0.45,
	slower: 0.6,
} as const;

export type DurationKey = keyof typeof DURATION;

// ─── Distances (px) ─────────────────────────────────────────────────────────────────

export const DISTANCE = {
	sm: 8,
	md: 16,
	lg: 32,
	xl: 64,
} as const;

export type DistanceKey = keyof typeof DISTANCE;

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Hidden-state offset for a directional reveal — the element travels *toward* its resting place. */
const offset = (direction: Direction, distance: number): TargetAndTransition => {
	switch (direction) {
		case 'up':
			return { y: distance };
		case 'down':
			return { y: -distance };
		case 'left':
			return { x: distance };
		case 'right':
			return { x: -distance };
	}
};

// ─── Transitions ────────────────────────────────────────────────────────────────────

export const SPRING: Transition = { type: 'spring', stiffness: 400, damping: 28, mass: 0.6 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 300, damping: 30 };
export const SPRING_STIFF: Transition = { type: 'spring', stiffness: 550, damping: 30, mass: 0.5 };

/** Tween transition factory. */
export const transition = (duration: number = DURATION.base, ease: Bezier = EASE): Transition => ({ duration, ease });

/** Spring transition factory (override any field of the base spring). */
export const spring = (overrides: Transition = {}): Transition => ({ ...SPRING, ...overrides });

export const transitions = {
	spring: SPRING,
	springSoft: SPRING_SOFT,
	springStiff: SPRING_STIFF,
	tween: transition,
	fast: transition(DURATION.fast),
	base: transition(DURATION.base),
	slow: transition(DURATION.slow),
} as const;

// ─── Fades ──────────────────────────────────────────────────────────────────────────

export const fade = (delay: number = 0, duration: number = DURATION.base, ease: Bezier = EASE): Variants => ({
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { delay, duration, ease } },
	exit: { opacity: 0, transition: { duration: DURATION.fast, ease } },
});

const directionalFade = (
	direction: Direction,
	delay: number,
	duration: number,
	distance: number,
	ease: Bezier,
): Variants => {
	const from = offset(direction, distance);
	return {
		hidden: { opacity: 0, ...from },
		visible: { opacity: 1, x: 0, y: 0, transition: { delay, duration, ease } },
		exit: { opacity: 0, ...from, transition: { duration: DURATION.fast, ease } },
	};
};

export const fadeUp = (
	delay: number = 0,
	duration: number = DURATION.base,
	distance: number = DISTANCE.md,
	ease: Bezier = EASE,
): Variants => directionalFade('up', delay, duration, distance, ease);

export const fadeDown = (
	delay: number = 0,
	duration: number = DURATION.base,
	distance: number = DISTANCE.md,
	ease: Bezier = EASE,
): Variants => directionalFade('down', delay, duration, distance, ease);

export const fadeLeft = (
	delay: number = 0,
	duration: number = DURATION.base,
	distance: number = DISTANCE.md,
	ease: Bezier = EASE,
): Variants => directionalFade('left', delay, duration, distance, ease);

export const fadeRight = (
	delay: number = 0,
	duration: number = DURATION.base,
	distance: number = DISTANCE.md,
	ease: Bezier = EASE,
): Variants => directionalFade('right', delay, duration, distance, ease);

export const fades = { fade, fadeUp, fadeDown, fadeLeft, fadeRight } as const;

// ─── Slides & Scales ──────────────────────────────────────────────────────────────────

/** Pure transform slide (no opacity) — for elements that translate fully into view. */
export const slide = (
	direction: Direction = 'up',
	delay: number = 0,
	duration: number = DURATION.base,
	distance: number = DISTANCE.lg,
	ease: Bezier = EASE,
): Variants => {
	const from = offset(direction, distance);
	return {
		hidden: { ...from },
		visible: { x: 0, y: 0, transition: { delay, duration, ease } },
		exit: { ...from, transition: { duration: DURATION.fast, ease } },
	};
};

export const scaleIn = (
	delay: number = 0,
	duration: number = DURATION.base,
	from: number = 0.96,
	ease: Bezier = EASE_BACK,
): Variants => ({
	hidden: { opacity: 0, scale: from },
	visible: { opacity: 1, scale: 1, transition: { delay, duration, ease } },
	exit: { opacity: 0, scale: from, transition: { duration: DURATION.fast, ease: EASE } },
});

/** Stronger scale entrance (modals, popovers, emphasis). */
export const zoom = (
	delay: number = 0,
	duration: number = DURATION.base,
	from: number = 0.85,
	ease: Bezier = EASE,
): Variants => scaleIn(delay, duration, from, ease);

/**
 * Height auto expand/collapse (accordions, disclosures). `height` is the unavoidable
 * layout property here; it is co-animated with opacity and the host element MUST be
 * `overflow-hidden`. Prefer transform-based variants everywhere else.
 */
export const expandHeight = (duration: number = DURATION.base, ease: Bezier = EASE): Variants => ({
	hidden: { height: 0, opacity: 0 },
	visible: { height: 'auto', opacity: 1, transition: { duration, ease } },
	exit: { height: 0, opacity: 0, transition: { duration: DURATION.fast, ease } },
});

export const slides = { slide, expandHeight } as const;
export const scales = { scaleIn, zoom } as const;

// ─── Layout / Containers (stagger) ──────────────────────────────────────────────────────

export const staggerContainer = (stagger: number = 0.06, delayChildren: number = 0): Variants => ({
	hidden: {},
	visible: { transition: { staggerChildren: stagger, delayChildren } },
	exit: { transition: { staggerChildren: stagger / 2, staggerDirection: -1 } },
});

export const staggerItem = (
	distance: number = DISTANCE.sm,
	duration: number = DURATION.base,
	ease: Bezier = EASE,
): Variants => ({
	hidden: { opacity: 0, y: distance },
	visible: { opacity: 1, y: 0, transition: { duration, ease } },
	exit: { opacity: 0, y: distance, transition: { duration: DURATION.fast, ease } },
});

export const containers = { staggerContainer, staggerItem } as const;

// ─── Micro-interactions (whileHover / whileTap / whileFocus) ───────────────────────────────

export const tap: TargetAndTransition = { scale: 0.96 };
export const tapSoft: TargetAndTransition = { scale: 0.98 };

export const hoverLift: TargetAndTransition = { scale: 1.02, y: -1 };
export const hoverGrow: TargetAndTransition = { scale: 1.04 };
export const hoverPop: TargetAndTransition = { scale: 1.08 };

export const focusRing: TargetAndTransition = { scale: 1.01 };

export const interactions = {
	hover: { lift: hoverLift, grow: hoverGrow, pop: hoverPop },
	tap: { press: tap, soft: tapSoft },
	focus: { ring: focusRing },
} as const;

// ─── Ambient loops (continuous, decorative — spread into `animate`) ─────────────────────────

/** Blinking status dot — opacity + scale breathe, repeats forever. */
export const pulseDot = (duration: number = 1.5): TargetAndTransition => ({
	opacity: [1, 0.3, 1],
	scale: [1, 0.8, 1],
	transition: { duration, ease: EASE_IN_OUT, repeat: Infinity },
});

/** Subtle self-axis wobble (icons) — rotates a few degrees back and forth, never a full turn. */
export const wobble = (angle: number = 8, duration: number = 2.6, delay: number = 0): TargetAndTransition => ({
	rotate: [-angle, angle, -angle],
	transition: { duration, ease: EASE_IN_OUT, repeat: Infinity, delay },
});

/** Gentle floating drift + tilt around the element's own axis (decorative badges). */
export const float = (distance: number = 4, duration: number = 3, delay: number = 0): TargetAndTransition => ({
	y: [-distance, distance, -distance],
	rotate: [-5, 5, -5],
	transition: { duration, ease: EASE_IN_OUT, repeat: Infinity, delay },
});

/** Slow scale breathe (emphasis halo / centerpiece). */
export const breathe = (scaleTo: number = 1.06, duration: number = 3.5): TargetAndTransition => ({
	scale: [1, scaleTo, 1],
	transition: { duration, ease: EASE_IN_OUT, repeat: Infinity },
});

export const verticalFloat = (distance: number = 4, duration: number = 3, delay: number = 0): TargetAndTransition => ({
	y: [-distance, distance, -distance],
	rotate: [-1, 1, -1],
	transition: { duration, ease: EASE_IN_OUT, repeat: Infinity, delay },
});

export const loops = { pulseDot, wobble, float, breathe, verticalFloat } as const;

// ─── Page transitions ──────────────────────────────────────────────────────────────────

export const pageTransition: Variants = {
	hidden: { opacity: 0, y: 10 },
	visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
	exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE } },
};

export const pageFade = (duration: number = DURATION.base): Variants => fade(0, duration);

export const pageSlide = (
	direction: Direction = 'up',
	distance: number = DISTANCE.sm,
	duration: number = DURATION.base,
): Variants => directionalFade(direction, 0, duration, distance, EASE);

export const pages = { default: pageTransition, fade: pageFade, slide: pageSlide } as const;
