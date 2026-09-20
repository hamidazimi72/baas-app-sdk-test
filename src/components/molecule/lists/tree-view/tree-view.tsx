'use client';

import { useEffect, useMemo, useState } from 'react';

import { ChevronDown, ChevronLeft, ChevronsDownUp } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TreeViewProps<T, V extends string | number = string> = {
	boxProps?: React.ComponentProps<'div'>;
	//
	items: T[];
	getValue: (item: T) => V;
	getParentValue: (item: T) => V | null | undefined;
	getLabel: (item: T) => React.ReactNode;
	getIcon?: (item: T) => React.ReactNode;
	getMeta?: (item: T) => React.ReactNode;
	getKey?: (item: T) => React.Key;
	collapseLabel?: React.ReactNode;
};

type TreeNode<T, V extends string | number> = {
	item: T;
	value: V;
	children: TreeNode<T, V>[];
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const TreeView = <T, V extends string | number = string>({
	boxProps,
	//
	items,
	getValue,
	getParentValue,
	getLabel,
	getIcon,
	getMeta,
	getKey,
	collapseLabel = 'بستن شاخه‌ها',
}: TreeViewProps<T, V>) => {
	// ─── Computed ────────────────────────────────────────────────────────────────

	const { roots, nodesByValue } = useMemo(() => {
		const nodes = new Map<V, TreeNode<T, V>>();
		items.forEach((item) => nodes.set(getValue(item), { item, value: getValue(item), children: [] }));
		const rootNodes: TreeNode<T, V>[] = [];

		items.forEach((item) => {
			const node = nodes.get(getValue(item));
			const parentValue = getParentValue(item);
			if (!node || parentValue == null || !nodes.has(parentValue) || parentValue === node.value) {
				if (node) rootNodes.push(node);
				return;
			}
			nodes.get(parentValue)?.children.push(node);
		});

		return { roots: rootNodes, nodesByValue: nodes };
	}, [getParentValue, getValue, items]);

	const allValues = useMemo(() => items.map(getValue), [getValue, items]);
	const [expanded, setExpanded] = useState<Set<V>>(() => new Set(allValues));

	// ─── Effects ─────────────────────────────────────────────────────────────────

	useEffect(() => {
		setExpanded((current) =>
			current.size === 0 && allValues.length > 0
				? new Set(allValues)
				: new Set([...current].filter((itemValue) => nodesByValue.has(itemValue))),
		);
	}, [allValues, nodesByValue]);

	// ─── Handlers ────────────────────────────────────────────────────────────────

	const expandHandler = (itemValue: V) => {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(itemValue)) next.delete(itemValue);
			else next.add(itemValue);
			return next;
		});
	};

	const collapseAllHandler = () => setExpanded(new Set());

	// ─── Render Helpers ──────────────────────────────────────────────────────────

	const renderNode = (node: TreeNode<T, V>, level: number): React.ReactNode => {
		const hasChildren = node.children.length > 0;
		const isExpanded = expanded.has(node.value);

		return (
			<div key={getKey?.(node.item) ?? String(node.value)} className='flex flex-col gap-1'>
				<div
					className='flex min-h-11 items-center gap-2 rounded-lg border border-divider/20 bg-surface-secondary px-4 py-3 transition-colors hover:bg-surface-tertiary'
					style={{ marginInlineStart: `${level * 1.5}rem` }}
				>
					{hasChildren ? (
						<button
							type='button'
							aria-label={isExpanded ? 'بستن' : 'باز کردن'}
							onClick={() => expandHandler(node.value)}
							className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-primary hover:text-text-primary'
						>
							{isExpanded ? <ChevronDown size={17} /> : <ChevronLeft size={17} />}
						</button>
					) : (
						<span className='w-7 shrink-0' />
					)}
					{getIcon && <span className='shrink-0'>{getIcon(node.item)}</span>}
					<div className='flex min-w-0 flex-1 items-center gap-1'>
						<span className='truncate font-medium text-text-primary'>{getLabel(node.item)}</span>
						{getMeta && (
							<span className='shrink-0 truncate text-xs text-text-tertiary' dir='ltr'>
								({getMeta(node.item)})
							</span>
						)}
					</div>
				</div>
				{hasChildren && isExpanded && node.children.map((child) => renderNode(child, level + 1))}
			</div>
		);
	};

	return (
		<div {...boxProps} className={cn('flex flex-col gap-2', boxProps?.className)}>
			<div className='flex justify-end'>
				<button
					type='button'
					onClick={collapseAllHandler}
					disabled={expanded.size === 0}
					className='flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50'
				>
					<ChevronsDownUp size={14} />
					{collapseLabel}
				</button>
			</div>
			{roots.map((node) => renderNode(node, 0))}
		</div>
	);
};
