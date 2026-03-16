import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * AppLayout - Main authenticated layout wrapper
 *
 * Unified layout for all authenticated users:
 * - Sidebar on the left with navigation links
 * - Main content area rendering child routes via Outlet
 */
export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-[var(--base-surface-1,#141414)]">
      {/* Sidebar - Always visible for authenticated users */}
      <Sidebar />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto bg-[var(--base-surface-1,#141414)]">
        <Outlet />
      </main>
    </div>
  );
}
