import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { useLogout } from '@hooks/useAuth';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@lib/cn';
import { AbakoLogo } from '@components/ui/AbakoLogo';
import { AvailabilityPopover } from '@components/features/availability/AvailabilityPopover';

/**
 * Sidebar - Left navigation sidebar matching Figma design
 *
 * Figma specs:
 * - w-[200px], full height
 * - bg-[var(--base-surface-2,#231f1f)]
 * - border-right: 1px solid var(--base-border,#3d3d3d)
 * - Padding: 16px
 *
 * TOP: Logo + Notification bell with indicator
 * NAV MENU:
 *   - Each item: flex row, gap-12px, px-16px, py-12px, rounded-12px
 *   - Active: bg-[var(--base-fill-1,#333)], text-[var(--state-brand-active,#36d399)]
 *   - Inactive: text-[var(--text-dark-primary,#f5f5f5)], hover bg-[var(--base-fill-1)]
 *   - Icon (24px) + Label text (Inter Medium, 16px)
 *
 * BOTTOM: User avatar + name + role with online dot
 *
 * Matches Figma component from Team Definition screen (1039:10096)
 */
export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { mutate: logout } = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const toggleAvailability = useCallback(() => setAvailabilityOpen((v) => !v), []);
  const closeAvailability = useCallback(() => setAvailabilityOpen(false), []);

  const isClient = !!user?.clientId;
  const isDeveloper = !!user?.developerId;
  const role = isClient ? 'Client' : isDeveloper ? 'Developer' : 'User';

  // Navigation links - always shown for authenticated users
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
    { to: '/projects', label: 'Projects', icon: 'ri-folder-line' },
    { to: '/payments', label: 'Payments', icon: 'ri-money-dollar-circle-line' },
    { to: '/profile', label: 'Profile', icon: 'ri-user-line' },
    { to: '/settings', label: 'Settings', icon: 'ri-settings-line' },
  ];

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Mobile hamburger button - positioned top-left */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--base-surface-2,#231f1f)] border border-[var(--base-border,#3d3d3d)] text-[var(--text-dark-primary,#f5f5f5)]"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="sidebar-nav"
      >
        <i className={cn('text-2xl', isOpen ? 'ri-close-line' : 'ri-menu-line')}></i>
      </button>

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen',
          'w-[256px] min-w-[256px]',
          'px-[var(--spacing-7,12px)] py-[var(--spacing-8,16px)] flex flex-col',
          'bg-[var(--base-surface-2,#231f1f)] border-r border-[var(--base-border,#3d3d3d)]',
          'transition-transform duration-300 z-40',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* TOP - Logo + Notification */}
        <div className="flex items-center justify-between mb-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <AbakoLogo size={18} />
            <span className="text-[var(--text-dark-primary,#f5f5f5)] font-semibold text-base">Abako</span>
          </div>

          {/* Notification bell with indicator */}
          <button
            className="relative w-8 h-8 flex items-center justify-center"
            aria-label="Notifications"
          >
            <i className="ri-notification-line text-xl text-[var(--text-dark-primary,#f5f5f5)]"></i>
            {/* Green indicator dot */}
            <span className="absolute top-0 right-0 w-[10px] h-[10px] bg-[var(--state-success-active,#85efac)] rounded-full border-2 border-[var(--base-surface-2,#231f1f)]"></span>
          </button>
        </div>

        {/* NAV MENU */}
        <nav className="flex-1">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-[var(--spacing-7,12px)]',
                      'pl-[var(--spacing-8,16px)] pr-[var(--spacing-5,8px)] py-[var(--spacing-7,12px)]',
                      'rounded-[var(--radi-6,12px)]',
                      'font-medium text-base',
                      'transition-colors',
                      isActive
                        ? 'bg-[var(--base-fill-1,#333)] text-[var(--state-brand-active,#36d399)]'
                        : 'text-[var(--text-dark-primary,#f5f5f5)] hover:bg-[var(--base-fill-1,#333)]'
                    )
                  }
                >
                  <i className={cn(link.icon, 'text-2xl')}></i>
                  <span>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* BOTTOM - User section */}
        <div className="relative border-t border-[var(--base-border,#3d3d3d)] pt-4">
          <div className="flex items-center justify-between gap-3 px-2">
            {/* Clickable user area - opens availability popover for developers */}
            <button
              className="flex items-center gap-3 min-w-0 text-left"
              onClick={isDeveloper ? toggleAvailability : undefined}
              aria-haspopup={isDeveloper ? 'dialog' : undefined}
              aria-expanded={isDeveloper ? availabilityOpen : undefined}
            >
              {/* Avatar with online dot */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-[var(--base-fill-1,#333)] border border-[var(--base-border,#3d3d3d)] flex items-center justify-center overflow-hidden">
                  <i className="ri-user-smile-line text-base text-[var(--text-dark-primary,#f5f5f5)]"></i>
                </div>
                {/* Online status dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[var(--state-brand-active,#36d399)] rounded-full border-2 border-[var(--base-surface-2,#231f1f)]"></span>
              </div>

              {/* Name + Availability status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-dark-primary,#f5f5f5)] truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] truncate">
                  {isDeveloper ? 'Available for Hire' : role}
                </p>
              </div>
            </button>

            {/* Logout button */}
            <button
              className="shrink-0"
              aria-label="Logout"
              onClick={() => logout(undefined, { onSuccess: () => navigate('/login') })}
            >
              <i className="ri-logout-box-r-line text-2xl text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]"></i>
            </button>
          </div>

          {/* Availability popover (developers only) */}
          {isDeveloper && (
            <AvailabilityPopover open={availabilityOpen} onClose={closeAvailability} />
          )}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
