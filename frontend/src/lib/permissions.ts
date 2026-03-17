/**
 * Permission Utilities
 *
 * Frontend port of backend/controllers/permission.js.
 * Pure functions that check user permissions against Zustand auth state.
 *
 * Usage:
 *   import { isClient, isProjectClient } from '@/lib/permissions';
 *   const user = useAuthStore((s) => s.user);
 *   if (isClient(user)) { ... }
 */

import type { User } from '@/types/index';

// ---------------------------------------------------------------------------
// Basic role checks
// ---------------------------------------------------------------------------

/** Check if the user is a client. */
export function isClient(user: User | null): boolean {
  return !!user?.clientId;
}

/** Check if the user is a developer. */
export function isDeveloper(user: User | null): boolean {
  return !!user?.developerId;
}

// ---------------------------------------------------------------------------
// Identity checks (is the user THIS specific client/developer?)
// ---------------------------------------------------------------------------

/** Check if the user is a specific client (by clientId). */
export function isClientSelf(user: User | null, clientId: string): boolean {
  return isClient(user) && String(user?.clientId) === String(clientId);
}

/** Check if the user is a specific developer (by developerId). */
export function isDeveloperSelf(user: User | null, developerId: string): boolean {
  return isDeveloper(user) && String(user?.developerId) === String(developerId);
}

// ---------------------------------------------------------------------------
// Project-scoped permission checks
// ---------------------------------------------------------------------------

/** Check if the user is the client who owns the project. */
export function isProjectClient(user: User | null, projectClientId: string): boolean {
  return isClient(user) && String(user?.clientId) === String(projectClientId);
}

/** Check if the user is the consultant assigned to the project. */
export function isProjectConsultant(user: User | null, projectConsultantId: string | undefined): boolean {
  if (!projectConsultantId) return false;
  return isDeveloper(user) && String(user?.developerId) === String(projectConsultantId);
}

/** Check if the user is the developer assigned to a milestone. */
export function isMilestoneDeveloper(user: User | null, milestoneDeveloperId: string | undefined): boolean {
  if (!milestoneDeveloperId) return false;
  return isDeveloper(user) && String(user?.developerId) === String(milestoneDeveloperId);
}

// ---------------------------------------------------------------------------
// Composite permission check
// ---------------------------------------------------------------------------

interface PermissionOptions {
  client?: boolean;
  projectClient?: string;
  developer?: boolean;
  projectConsultant?: string | undefined;
  milestoneDeveloper?: string | undefined;
}

/**
 * Composite permission check - returns true if the user matches ANY
 * of the specified permission types.
 *
 * Port of backend's `userTypesRequired()` middleware.
 *
 * @example
 *   // Allow project client OR project consultant
 *   const allowed = checkPermission(user, {
 *     projectClient: project.clientId,
 *     projectConsultant: project.consultantId,
 *   });
 */
export function checkPermission(user: User | null, options: PermissionOptions): boolean {
  if (!user) return false;

  if (options.client && isClient(user)) return true;
  if (options.projectClient && isProjectClient(user, options.projectClient)) return true;
  if (options.developer && isDeveloper(user)) return true;
  if (options.projectConsultant && isProjectConsultant(user, options.projectConsultant)) return true;
  if (options.milestoneDeveloper && isMilestoneDeveloper(user, options.milestoneDeveloper)) return true;

  return false;
}
