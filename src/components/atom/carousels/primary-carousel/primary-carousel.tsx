'use client';

import { Children, useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper';

import { cn } from '@/lib/utils';

import 'swiper/css';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CarouselPagination = {
	onChange: (pageIndex: number) => void;
	pageSize: number;
	pageIndex: number;
	total: number;
	itemIndex?: number;
};

export type PrimaryCarouselProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	children: React.ReactNode;
	slidesPerView?: number | 'auto';
	spaceBetween?: number;
	pagination?: CarouselPagination;
	/**
	 * Inner safe-zone around the slides. Swiper clips overflow, so hover
	 * transforms (scale/lift) and selected rings on edge/top/bottom slides would
	 * be cut off — this padding lives *inside* the clip box so they stay visible
	 * while off-screen slides remain hidden. Override only for unusually large
	 * hover effects. Must be plain padding utilities (kept off-screen slides hidden).
	 */
	edgeClassName?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PrimaryCarousel: React.FC<PrimaryCarouselProps> = ({
	boxProps,
	//
	children,
	slidesPerView = 'auto',
	spaceBetween = 12,
	pagination,
	edgeClassName = '!px-1 !py-1.5',
}) => {
	const [swiper, setSwiper] = useState<SwiperClass | null>(null);
	const [isBeginning, setIsBeginning] = useState(true);
	const [isEnd, setIsEnd] = useState(false);

	// ─── Computed ─────────────────────────────────────────────────────────────

	// Page-level navigation is offered only when a `pagination` contract is given
	// and a previous/next page actually exists for the current page.
	const hasPrevPage = !!pagination && pagination.pageIndex > 0;
	const hasNextPage = !!pagination && (pagination.pageIndex + 1) * pagination.pageSize < pagination.total;

	const showPrev = !isBeginning || hasPrevPage;
	const showNext = !isEnd || hasNextPage;
	const hasControls = showPrev || showNext;

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const syncEdges = (instance: SwiperClass) => {
		setIsBeginning(instance.isBeginning);
		setIsEnd(instance.isEnd);
	};

	const prevHandler = () => {
		if (!isBeginning) {
			swiper?.slidePrev();
			return;
		}
		if (hasPrevPage) pagination?.onChange(pagination.pageIndex - 1);
	};

	const nextHandler = () => {
		if (!isEnd) {
			swiper?.slideNext();
			return;
		}
		if (hasNextPage) pagination?.onChange(pagination.pageIndex + 1);
	};

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const arrow = (direction: 'prev' | 'next', visible: boolean, onClick: () => void) => (
		<button
			type='button'
			onClick={onClick}
			disabled={!visible}
			aria-label={direction === 'prev' ? 'قبلی' : 'بعدی'}
			className={cn(
				'flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
				visible
					? 'border-divider/30 bg-surface-primary text-text-tertiary hover:border-primary/40 hover:text-text-primary'
					: 'pointer-events-none border-transparent text-transparent',
			)}
		>
			{direction === 'prev' ? (
				<ChevronRight size={18} strokeWidth='1.5px' />
			) : (
				<ChevronLeft size={18} strokeWidth='1.5px' />
			)}
		</button>
	);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('flex items-center gap-2', boxProps?.className)}>
			{hasControls && arrow('prev', showPrev, prevHandler)}

			<Swiper
				dir='rtl'
				slidesPerView={slidesPerView}
				spaceBetween={spaceBetween}
				initialSlide={pagination?.itemIndex ?? 0}
				onSwiper={(instance) => {
					setSwiper(instance);
					syncEdges(instance);
				}}
				onSlideChange={syncEdges}
				onResize={syncEdges}
				className={cn('min-w-0 flex-1', edgeClassName)}
			>
				{Children.map(children, (child, index) => (
					<SwiperSlide key={index} className='w-auto!'>
						{child}
					</SwiperSlide>
				))}
			</Swiper>

			{hasControls && arrow('next', showNext, nextHandler)}
		</div>
	);
};
