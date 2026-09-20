import type { API } from '@/services';
import { universal_workspace } from '@/zustand';

// ─── Types ──────────────────────────────────────────────────────────────────

type WorkspaceMode = 'super' | 'tenant';

interface UseWorkspaceReturn {
	mode: WorkspaceMode;
	activeTenant: API.Tenant.Type.TenantDTO | null;
	effectiveTenantId: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Single source of truth for "which panel am I in and for which tenant".
 * - No selected tenant → `super` mode (management console).
 * - A selected tenant → `tenant` mode, scoped to that tenant.
 */
function useWorkspace(): UseWorkspaceReturn {
	const persistedTenant = universal_workspace.useStore((s) => s.activeTenant);

	const activeTenant = persistedTenant;
	const mode: WorkspaceMode = activeTenant ? 'tenant' : 'super';
	const effectiveTenantId = activeTenant?.tenantId ?? null;

	return { mode, activeTenant, effectiveTenantId };
}

export { useWorkspace };
export type { UseWorkspaceReturn, WorkspaceMode };
