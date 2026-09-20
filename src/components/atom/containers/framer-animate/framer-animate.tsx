import { motion } from 'framer-motion';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useObserveIntersection } from '@/hooks';

type MotionProps = React.ComponentProps<typeof motion.div>;

type FramerAnimateProps = MotionProps & {
	children?: ReactNode[] | ReactNode;
	disableEntryIntersecting?: boolean;
};

export const FramerAnimate: React.FC<FramerAnimateProps> = ({
	//
	children,

	animate = {},
	transition = {},
	disableEntryIntersecting,

	...props
}) => {
	const ref = useRef<HTMLDivElement | null>(null);

	const entry = useObserveIntersection(ref);

	const [animated, animatedDispatch] = useState(disableEntryIntersecting);

	useEffect(() => {
		if (disableEntryIntersecting) return animatedDispatch(true);
		if (!animated && entry?.isIntersecting) animatedDispatch(true);
	}, [entry?.isIntersecting]);

	return (
		<motion.div
			ref={ref}
			animate={animated ? animate : { visibility: 'hidden' }}
			transition={animated ? transition : {}}
			{...props}
		>
			{children}
		</motion.div>
	);
};
