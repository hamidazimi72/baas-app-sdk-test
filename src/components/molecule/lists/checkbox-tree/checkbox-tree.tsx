'use client';

import { useEffect, useMemo, useState } from 'react';

import { Check, ChevronDown, ChevronLeft, ChevronsDownUp, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CheckboxTreeProps<T, V extends string | number = string> = {
	boxProps?: React.ComponentProps<'div'>;
	//
	items: T[];
	value: V[];
	onChange: (value: V[]) => void;
	getValue: (item: T) => V;
	getParentValue: (item: T) => V | null | undefined;
	getLabel: (item: T) => React.ReactNode;
	getKey?: (item: T) => React.Key;
	disabled?: boolean;
	collapseLabel?: React.ReactNode;
};

type TreeNode<T, V extends string | number> = {
	item: T;
	value: V;
	children: TreeNode<T, V>[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const collectValues = <T, V extends string | number>(node: TreeNode<T, V>): V[] => [
	node.value,
	...node.children.flatMap(collectValues),
];

// ─── Component ─────────────────────────────────────────────────────────────────

export const CheckboxTree = <T, V extends string | number = string>({
	boxProps,
	//
	items,
	value,
	onChange,
	getValue,
	getParentValue,
	getLabel,
	getKey,
	disabled = false,
	collapseLabel = 'بستن شاخه‌ها',
}: CheckboxTreeProps<T, V>) => {
	// ─── Computed ────────────────────────────────────────────────────────────────

	const { roots, nodesByValue } = useMemo(() => {
		const nodes = new Map<V, TreeNode<T, V>>();
		items.forEach((item) => nodes.set(getValue(item), { item, value: getValue(item), children: [] }));
		const rootNodes: TreeNode<T, V>[] = [];
		items.forEach((item) => {
			const node = nodes.get(getValue(item));
			const parent = getParentValue(item);
			if (!node || parent == null || !nodes.has(parent) || parent === node.value)
				rootNodes.push(node as TreeNode<T, V>);
			else nodes.get(parent)?.children.push(node);
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

	const selectionHandler = (node: TreeNode<T, V>) => {
		if (disabled) return;
		const nodeValues = collectValues(node);
		const selected = new Set(value);
		const checked = nodeValues.every((itemValue) => selected.has(itemValue));
		nodeValues.forEach((itemValue) => (checked ? selected.delete(itemValue) : selected.add(itemValue)));

		let parentValue = getParentValue(node.item);
		while (parentValue != null) {
			const parent = nodesByValue.get(parentValue);
			if (!parent) break;
			const hasSelectedDescendant = collectValues(parent)
				.slice(1)
				.some((itemValue) => selected.has(itemValue));
			if (hasSelectedDescendant) selected.add(parent.value);
			else selected.delete(parent.value);
			parentValue = getParentValue(parent.item);
		}
		onChange(allValues.filter((itemValue) => selected.has(itemValue)));
	};

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
		const descendants = collectValues(node);
		const selected = new Set(value);
		const checked = descendants.every((itemValue) => selected.has(itemValue));
		const partiallyChecked = !checked && descendants.some((itemValue) => selected.has(itemValue));
		const hasChildren = node.children.length > 0;
		const isExpanded = expanded.has(node.value);

		return (
			<div key={getKey?.(node.item) ?? String(node.value)}>
				<div
					className={cn(
						'flex min-h-11 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-surface-tertiary',
						disabled && 'opacity-60',
					)}
					style={{ paddingInlineStart: `${level * 1.5 + 0.5}rem` }}
				>
					{hasChildren ? (
						<button
							type='button'
							aria-label={isExpanded ? 'بستن' : 'باز کردن'}
							onClick={() => expandHandler(node.value)}
							className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-secondary hover:text-text-primary'
						>
							{isExpanded ? <ChevronDown size={17} /> : <ChevronLeft size={17} />}
						</button>
					) : (
						<span className='w-7 shrink-0' />
					)}
					<button
						type='button'
						role='checkbox'
						aria-checked={partiallyChecked ? 'mixed' : checked}
						aria-label={String(getLabel(node.item))}
						disabled={disabled}
						onClick={() => selectionHandler(node)}
						className={cn(
							'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
							checked || partiallyChecked
								? 'border-primary bg-primary text-text-on-brand'
								: 'border-divider bg-transparent text-transparent',
						)}
					>
						{partiallyChecked ? <Minus size={14} /> : <Check size={14} />}
					</button>
					<button
						type='button'
						disabled={disabled}
						onClick={() => selectionHandler(node)}
						className='flex-1 text-start text-sm text-text-primary disabled:cursor-not-allowed'
					>
						{getLabel(node.item)}
					</button>
				</div>
				{hasChildren && isExpanded && node.children.map((child) => renderNode(child, level + 1))}
			</div>
		);
	};

	return (
		<div
			{...boxProps}
			className={cn('rounded-lg border border-divider/20 bg-surface-secondary p-2', boxProps?.className)}
		>
			<div className='mb-2 flex justify-end border-b border-divider/20 pb-2'>
				<button
					type='button'
					onClick={collapseAllHandler}
					disabled={disabled || expanded.size === 0}
					className='flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50'
				>
					<ChevronsDownUp size={14} />
					{collapseLabel}
				</button>
			</div>
			{roots.map((node) => renderNode(node, 0))}
		</div>
	);
};
