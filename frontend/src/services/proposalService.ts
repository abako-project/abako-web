/**
 * Proposal Service Layer
 *
 * Port of backend/models/seda/proposal.js to TypeScript.
 * Handles project proposal creation and updates.
 *
 * Key functions:
 * - createProposal: Deploy a new project from proposal data
 * - updateProposal: Update an existing project proposal
 */

import { deployProject, updateProject } from '@/api/adapter';
import type { ProposalCreateData, ProposalUpdateData } from '@/types';

// ---------------------------------------------------------------------------
// Create a new proposal (deploy project)
// ---------------------------------------------------------------------------

/**
 * Creates a new project from a proposal.
 * Calls the deployProject API and returns the created project ID.
 *
 * @param clientId - ID of the client creating the proposal
 * @param data - Proposal data (title, summary, description, etc.)
 * @param token - Authentication token
 * @returns Project ID of the created project
 */
export async function createProposal(
  clientId: string,
  data: ProposalCreateData,
  token: string
): Promise<string> {
  const response = await deployProject(
    'v5',
    {
      title: data.title,
      summary: data.summary,
      description: data.description,
      projectType: data.projectType,
      url: data.url,
      budget: data.budget,
      deliveryTime: data.deliveryTime,
      deliveryDate: data.deliveryDate,
    },
    clientId,
    token
  );

  return response.projectId;
}

// ---------------------------------------------------------------------------
// Update an existing proposal
// ---------------------------------------------------------------------------

/**
 * Updates an existing project proposal.
 * Only updates the provided fields.
 *
 * @param projectId - ID or contract address of the project
 * @param data - Proposal data to update
 * @param token - Authentication token
 * @returns Update response from the API
 */
export async function updateProposal(
  projectId: string,
  data: ProposalUpdateData,
  token: string
): Promise<unknown> {
  const updateData: Record<string, unknown> = {};

  // Only include defined fields
  if (data.title !== undefined) updateData.title = data.title;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.projectType !== undefined) updateData.projectType = data.projectType;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.deliveryTime !== undefined) updateData.deliveryTime = data.deliveryTime;
  if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate;
  if (data.clientResponse !== undefined) updateData.clientResponse = data.clientResponse;

  const response = await updateProject(projectId, updateData, token);
  return response;
}
