/**
 * Calendar Service
 *
 * Business logic for calendar/availability operations.
 * Ported from backend/models/seda/calendar.js
 *
 * This service layer wraps the adapter API and Virto API for worker
 * registration, availability management, and calendar contract operations.
 */

import {
  getRegisteredWorkers as apiGetRegisteredWorkers,
  getAllWorkersAvailability,
  registerWorker as apiRegisterWorker,
  deployCalendar as apiDeployCalendar,
  registerWorkers as apiRegisterWorkers,
  setAvailability as apiSetAvailability,
  getAvailabilityHours as apiGetAvailabilityHours,
  isAvailable as apiIsAvailable,
  getAvailableWorkers as apiGetAvailableWorkers,
} from '@/api/adapter';

import { getUserAddress as virtoGetUserAddress } from '@/api/virto';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface ApiResponse {
  success: boolean;
  response?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all registered workers in the calendar contract.
 *
 * @returns Response object with worker addresses
 */
export async function getRegisteredWorkers(): Promise<Record<string, unknown>> {
  const response = await apiGetRegisteredWorkers();
  return response as Record<string, unknown>;
}

/**
 * Get availability information for all workers.
 *
 * @returns Response object with worker availability data
 */
export async function getWorkersAvailability(): Promise<Record<string, unknown>> {
  const response = await getAllWorkersAvailability();
  return response;
}

/**
 * Get the blockchain address for a worker by their userId.
 *
 * For email-based users, this queries the Virto federated server to resolve
 * the email to a blockchain address. For wallet-based users, the userId IS
 * already the SS58 blockchain address, so we return it directly.
 *
 * @param userId - Worker email address or SS58 wallet address
 * @returns Blockchain address
 */
export async function getWorkerAddress(userId: string): Promise<string> {
  // Wallet users store their SS58 address as userId (no '@' sign).
  // Skip the Virto lookup and use the address directly.
  if (!userId.includes('@')) {
    return userId;
  }
  const response = await virtoGetUserAddress(userId);
  return response.address;
}

/**
 * Ensure a worker is registered in the calendar contract.
 *
 * This function checks if the worker is already registered, and if not,
 * registers them. It's idempotent - calling it multiple times for the
 * same worker is safe.
 *
 * @param userId - Worker email address (userId)
 * @param token - Authentication token
 * @throws {Error} If unable to get registered workers or worker address
 * @throws {Error} If registration fails
 */
export async function ensureWorkerRegistered(userId: string, token: string): Promise<void> {
  // Get all registered workers
  const response = await getRegisteredWorkers();
  const apiResponse = response as ApiResponse;
  if (!apiResponse.success) {
    throw new Error('Cannot get registered workers from calendar contract.');
  }
  const registeredWorkers = apiResponse.response || [];

  // Get worker address
  const address = await getWorkerAddress(userId);
  if (!address) {
    throw new Error('Cannot get worker address.');
  }

  // Register if not already registered
  if (!registeredWorkers.includes(address)) {
    const registerResponse = await apiRegisterWorker(address, token);
    const apiRegisterResponse = registerResponse as ApiResponse;
    if (!apiRegisterResponse.success) {
      throw new Error('Cannot register worker in calendar contract.');
    }
  }
}

/**
 * Deploy a new calendar contract.
 *
 * @param version - Contract version (e.g., 'v5')
 * @param token - Authentication token
 * @returns Response with contract address
 */
export async function deployCalendarContract(
  version: string,
  token: string
): Promise<Record<string, unknown>> {
  try {
    return await apiDeployCalendar(version, token);
  } catch (error) {
    console.error('[SEDA Calendar] Error deploying calendar:', (error as Error).message);
    throw error;
  }
}

/**
 * Register multiple workers in the calendar contract.
 *
 * @param workers - Array of worker addresses
 * @param token - Authentication token
 * @returns Response from backend
 */
export async function registerMultipleWorkers(
  workers: string[],
  token: string
): Promise<Record<string, unknown>> {
  try {
    return await apiRegisterWorkers(workers, token);
  } catch (error) {
    console.error('[SEDA Calendar] Error registering workers:', (error as Error).message);
    throw error;
  }
}

/**
 * Set availability for the current worker.
 *
 * @param availability - Availability type (e.g., 'FullTime', 'PartTime', 'WeeklyHours')
 * @param weeklyHours - Number of hours available per week
 * @param token - Authentication token
 * @returns Response from backend
 */
export async function setWorkerAvailability(
  availability: string,
  weeklyHours: number | undefined,
  token: string
): Promise<Record<string, unknown>> {
  try {
    return await apiSetAvailability(availability, weeklyHours, token);
  } catch (error) {
    console.error('[SEDA Calendar] Error setting availability:', (error as Error).message);
    throw error;
  }
}

/**
 * Get availability hours for a specific worker.
 *
 * @param worker - Worker address
 * @returns Availability hours object
 */
export async function getWorkerAvailabilityHours(worker: string): Promise<Record<string, unknown>> {
  try {
    return await apiGetAvailabilityHours(worker);
  } catch (error) {
    console.error('[SEDA Calendar] Error getting availability hours:', (error as Error).message);
    throw error;
  }
}

/**
 * Check if a worker is available.
 *
 * @param worker - Worker address
 * @param minHours - Optional minimum hours requirement
 * @returns Availability status object
 */
export async function checkWorkerAvailability(
  worker: string,
  minHours?: number
): Promise<Record<string, unknown>> {
  try {
    return await apiIsAvailable(worker, minHours);
  } catch (error) {
    console.error('[SEDA Calendar] Error checking availability:', (error as Error).message);
    throw error;
  }
}

/**
 * Get list of available workers.
 *
 * @param minHours - Optional minimum hours requirement
 * @returns List of available worker addresses
 */
export async function getAvailableWorkersList(minHours?: number): Promise<Record<string, unknown>> {
  try {
    return await apiGetAvailableWorkers(minHours);
  } catch (error) {
    console.error('[SEDA Calendar] Error getting available workers:', (error as Error).message);
    throw error;
  }
}

/**
 * Get availability data for all workers.
 *
 * Alias for getWorkersAvailability() to match the backend naming.
 *
 * @returns Availability data for all workers
 */
export async function getAllWorkersAvailabilityData(): Promise<Record<string, unknown>> {
  try {
    return await getAllWorkersAvailability();
  } catch (error) {
    console.error('[SEDA Calendar] Error getting all workers availability:', (error as Error).message);
    throw error;
  }
}
