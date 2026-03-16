/**
 * Scope Service
 *
 * Business logic for project scope operations.
 * Ported from backend/models/seda/scope.js
 *
 * This service layer provides thin wrappers around the adapter API
 * for scope submission, acceptance, and rejection.
 */

import {
  proposeScope,
  approveScope,
  rejectScope as apiRejectScope,
} from '@/api/adapter';
import type { ApproveScopeResponse } from '@/api/adapter';

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Submit a scope proposal for a project.
 *
 * Changes the project state to 'scope_proposed' and creates a consultant comment.
 *
 * @param projectId - Project ID or contract address
 * @param milestones - Array of milestone objects to propose
 * @param advancePaymentPercentage - Percentage of advance payment (0-100)
 * @param documentHash - Hash of the scope document
 * @param _consultantComment - Consultant comment (currently unused by the API)
 * @param token - Authentication token
 */
export async function submitScope(
  projectId: string,
  milestones: Record<string, unknown>[],
  advancePaymentPercentage: number,
  documentHash: string,
  _consultantComment: string,
  token: string
): Promise<void> {
  // Cast milestones to the expected API type
  // The adapter API expects MilestoneData[] but we receive generic milestone objects
  await proposeScope(
    projectId,
    milestones as never,
    advancePaymentPercentage,
    documentHash,
    token
  );
}

/**
 * Accept a scope proposal (client action).
 *
 * Changes the project state to 'scope_accepted' and updates the last comment
 * with the client's response.
 *
 * @param projectId - Project ID or contract address
 * @param approvedTaskIds - Array of task IDs that were approved
 * @param _clientResponse - Client response comment (currently unused by the API)
 * @param token - Authentication token
 */
export async function acceptScope(
  projectId: string,
  approvedTaskIds: number[],
  _clientResponse: string,
  token: string
): Promise<ApproveScopeResponse> {
  return approveScope(projectId, approvedTaskIds, token);
}

/**
 * Reject a scope proposal (client action).
 *
 * Changes the project state to 'scope_rejected' and updates the last comment
 * with the client's response.
 *
 * @param projectId - Project ID or contract address
 * @param clientResponse - Client rejection reason
 * @param token - Authentication token
 */
export async function rejectScope(
  projectId: string,
  clientResponse: string,
  token: string
): Promise<void> {
  await apiRejectScope(projectId, clientResponse, token);
}
