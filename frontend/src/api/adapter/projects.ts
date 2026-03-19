/**
 * Projects Adapter API
 *
 * Handles project operations with the adapter API.
 * Ported from backend/models/adapter.js (deployProject, assignCoordinator, proposeScope, getProject, etc.)
 */

import { adapterClient, handleApiError } from './client';
import { adapterConfig, API_TIMEOUTS } from '../config';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface ProjectData {
  title: string;
  summary: string;
  description: string;
  url: string;
  projectTypeId?: string | number;
  budgetId?: string | number;
  deliveryTimeId?: string | number;
  deliveryDate?: string | number;
  [key: string]: unknown;
}

interface DeployProjectResponse {
  projectId: string;
  contractAddress: string;
  [key: string]: unknown;
}

interface AssignCoordinatorResponse {
  success: boolean;
  [key: string]: unknown;
}

interface AssignTeamResponse {
  success: boolean;
  [key: string]: unknown;
}

interface MarkCompletedResponse {
  success: boolean;
  [key: string]: unknown;
}

interface SetCalendarContractResponse {
  success: boolean;
  [key: string]: unknown;
}

interface MilestoneData {
  title: string;
  description: string;
  budget?: string | number;
  deliveryTime?: string;
  deliveryDate?: string | number;
  [key: string]: unknown;
}

interface ProposeScopeResponse {
  success: boolean;
  [key: string]: unknown;
}

export interface ApproveScopeResponse {
  success: boolean;
  [key: string]: unknown;
}

interface RejectScopeResponse {
  success: boolean;
  [key: string]: unknown;
}

interface SubmitTaskForReviewResponse {
  success: boolean;
  [key: string]: unknown;
}

interface CompleteTaskResponse {
  success: boolean;
  [key: string]: unknown;
}

interface RejectTaskResponse {
  success: boolean;
  [key: string]: unknown;
}

interface GetProjectResponse {
  project: unknown;
  [key: string]: unknown;
}

interface GetProjectInfoResponse {
  project: unknown;
  [key: string]: unknown;
}

interface GetTeamResponse {
  team: unknown[];
  [key: string]: unknown;
}

interface GetScopeInfoResponse {
  scope: unknown;
  [key: string]: unknown;
}

interface GetTaskResponse {
  task: unknown;
  [key: string]: unknown;
}

interface GetTaskCompletionStatusResponse {
  completed: boolean;
  [key: string]: unknown;
}

export interface GetAllTasksResponse {
  milestones: unknown[];
  tasks?: unknown[];
  [key: string]: unknown;
}

interface UpdateProjectResponse {
  project: unknown;
  [key: string]: unknown;
}

interface CoordinatorRejectProjectResponse {
  success: boolean;
  [key: string]: unknown;
}

interface SubmitCoordinatorRatingsResponse {
  success: boolean;
  [key: string]: unknown;
}

interface SubmitDeveloperRatingResponse {
  success: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Project API methods
// ---------------------------------------------------------------------------

/**
 * Create a new project (deploy a proposal).
 * This function accepts an explicit token parameter that may differ from the stored auth token.
 */
export async function deployProject(
  version: string,
  projectData: ProjectData,
  clientId: string,
  token: string
): Promise<DeployProjectResponse> {
  try {
    const response = await adapterClient.post<DeployProjectResponse>(
      adapterConfig.endpoints.projects.deploy(version),
      { ...projectData, clientId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: API_TIMEOUTS.blockchainWrite,
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `deployProject(${version})`);
  }
}

/**
 * Assign a coordinator to a project.
 */
export async function assignCoordinator(
  contractAddress: string,
  token: string
): Promise<AssignCoordinatorResponse> {
  try {
    const response = await adapterClient.post<AssignCoordinatorResponse>(
      adapterConfig.endpoints.projects.assignCoordinator(contractAddress),
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `assignCoordinator(${contractAddress})`);
  }
}

/**
 * Assign a team to a project.
 */
export async function assignTeam(
  contractAddress: string,
  teamSize: number,
  token: string
): Promise<AssignTeamResponse> {
  try {
    const response = await adapterClient.post<AssignTeamResponse>(
      adapterConfig.endpoints.projects.assignTeam(contractAddress),
      { _team_size: teamSize },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `assignTeam(${contractAddress})`);
  }
}

/**
 * Mark a project as completed.
 */
export async function markCompleted(
  contractAddress: string,
  ratings: unknown,
  coordinatorRating: number,
  token: string
): Promise<MarkCompletedResponse> {
  try {
    const response = await adapterClient.post<MarkCompletedResponse>(
      adapterConfig.endpoints.projects.markCompleted(contractAddress),
      { ratings, coordinatorRating },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `markCompleted(${contractAddress})`);
  }
}

/**
 * Set the calendar contract for a project.
 */
export async function setCalendarContract(
  contractAddress: string,
  calendarContractAddress: string,
  token: string
): Promise<SetCalendarContractResponse> {
  try {
    const response = await adapterClient.post<SetCalendarContractResponse>(
      adapterConfig.endpoints.projects.setCalendarContract(contractAddress),
      { calendar_contract: calendarContractAddress },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `setCalendarContract(${contractAddress})`);
  }
}

/**
 * Propose a scope for a project.
 */
export async function proposeScope(
  projectId: string,
  milestones: MilestoneData[],
  advancePaymentPercentage: number,
  documentHash: string,
  token: string
): Promise<ProposeScopeResponse> {
  try {
    const response = await adapterClient.post<ProposeScopeResponse>(
      adapterConfig.endpoints.projects.proposeScope(projectId),
      {
        milestones,
        advance_payment_percentage: advancePaymentPercentage,
        document_hash: documentHash,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `proposeScope(${projectId})`);
  }
}

/**
 * Approve the scope of a project.
 */
export async function approveScope(
  projectId: string,
  approvedTaskIds: number[],
  token: string
): Promise<ApproveScopeResponse> {
  try {
    const response = await adapterClient.post<ApproveScopeResponse>(
      adapterConfig.endpoints.projects.approveScope(projectId),
      { approved_task_ids: approvedTaskIds },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `approveScope(${projectId})`);
  }
}

/**
 * Reject the scope of a project.
 */
export async function rejectScope(
  projectId: string,
  clientResponse: string,
  token: string
): Promise<RejectScopeResponse> {
  try {
    const response = await adapterClient.post<RejectScopeResponse>(
      adapterConfig.endpoints.projects.rejectScope(projectId),
      { clientResponse },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `rejectScope(${projectId})`);
  }
}

/**
 * Submit a task for review.
 */
export async function submitTaskForReview(
  projectId: string,
  taskId: string,
  token: string
): Promise<SubmitTaskForReviewResponse> {
  try {
    const response = await adapterClient.post<SubmitTaskForReviewResponse>(
      adapterConfig.endpoints.projects.submitTaskForReview(projectId),
      { task_id: taskId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `submitTaskForReview(${projectId},${taskId})`);
  }
}

/**
 * Complete a task.
 */
export async function completeTask(
  projectId: string,
  taskId: string,
  token: string
): Promise<CompleteTaskResponse> {
  try {
    const response = await adapterClient.post<CompleteTaskResponse>(
      adapterConfig.endpoints.projects.completeTask(projectId),
      { task_id: taskId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `completeTask(${projectId},${taskId})`);
  }
}

/**
 * Reject a task.
 */
export async function rejectTask(
  projectId: string,
  taskId: string,
  reason: string,
  token: string
): Promise<RejectTaskResponse> {
  try {
    const response = await adapterClient.post<RejectTaskResponse>(
      adapterConfig.endpoints.projects.rejectTask(projectId, taskId),
      { rejectionReason: reason },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `rejectTask(${projectId},${taskId},"${reason}")`);
  }
}

/**
 * Get a project by contract address.
 */
export async function getProject(contractAddress: string): Promise<GetProjectResponse> {
  try {
    const response = await adapterClient.get<GetProjectResponse>(
      `/projects/${contractAddress}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getProject(${contractAddress})`);
  }
}

/**
 * Get project info by project ID.
 */
export async function getProjectInfo(projectId: string): Promise<GetProjectInfoResponse> {
  try {
    const response = await adapterClient.get<GetProjectInfoResponse>(
      adapterConfig.endpoints.projects.getProjectInfo(projectId)
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getProjectInfo(${projectId})`);
  }
}

/**
 * Get the team assigned to a project.
 */
export async function getTeam(contractAddress: string): Promise<GetTeamResponse> {
  try {
    const response = await adapterClient.get<GetTeamResponse>(
      adapterConfig.endpoints.projects.getTeam(contractAddress)
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getTeam(${contractAddress})`);
  }
}

/**
 * Get scope information for a project.
 */
export async function getScopeInfo(projectId: string): Promise<GetScopeInfoResponse> {
  try {
    const response = await adapterClient.get<GetScopeInfoResponse>(
      adapterConfig.endpoints.projects.getScopeInfo(projectId)
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getScopeInfo(${projectId})`);
  }
}

/**
 * Get a specific task from a project.
 */
export async function getTask(contractAddress: string, taskId: string): Promise<GetTaskResponse> {
  try {
    const response = await adapterClient.get<GetTaskResponse>(
      adapterConfig.endpoints.projects.getTask(contractAddress),
      {
        params: { task_id: taskId },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getTask(${contractAddress}, ${taskId})`);
  }
}

/**
 * Get task completion status.
 */
export async function getTaskCompletionStatus(
  contractAddress: string,
  taskId: string
): Promise<GetTaskCompletionStatusResponse> {
  try {
    const response = await adapterClient.get<GetTaskCompletionStatusResponse>(
      adapterConfig.endpoints.projects.getTaskCompletion(contractAddress),
      {
        params: { task_id: taskId },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getTaskCompletionStatus(${contractAddress}, ${taskId})`);
  }
}

/**
 * Get all tasks for a project.
 */
export async function getAllTasks(projectId: string): Promise<GetAllTasksResponse> {
  try {
    const response = await adapterClient.get<GetAllTasksResponse>(
      adapterConfig.endpoints.projects.getAllTasks(projectId)
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getAllTasks(${projectId})`);
  }
}

/**
 * Update a project.
 */
export async function updateProject(
  contractAddress: string,
  data: Partial<ProjectData>,
  token: string
): Promise<UpdateProjectResponse> {
  try {
    const response = await adapterClient.put<UpdateProjectResponse>(
      adapterConfig.endpoints.projects.update(contractAddress),
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `updateProject(${contractAddress})`);
  }
}

/**
 * Coordinator rejects a project.
 */
export async function coordinatorRejectProject(
  contractAddress: string,
  rejectionReason: string,
  token: string
): Promise<CoordinatorRejectProjectResponse> {
  try {
    const response = await adapterClient.post<CoordinatorRejectProjectResponse>(
      adapterConfig.endpoints.projects.coordinatorReject(contractAddress),
      { rejectionReason },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `coordinatorRejectProject(${contractAddress})`);
  }
}

/**
 * Submit coordinator ratings for client and team members.
 */
export async function submitCoordinatorRatings(
  projectId: string,
  clientRating: number,
  teamRatings: Array<[string, number]>,
  token: string
): Promise<SubmitCoordinatorRatingsResponse> {
  try {
    const response = await adapterClient.post<SubmitCoordinatorRatingsResponse>(
      adapterConfig.endpoints.projects.submitCoordinatorRatings(projectId),
      { clientRating, teamRatings },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `submitCoordinatorRatings(${projectId})`);
  }
}

/**
 * Submit developer rating for coordinator.
 */
export async function submitDeveloperRating(
  projectId: string,
  coordinatorRating: number,
  token: string
): Promise<SubmitDeveloperRatingResponse> {
  try {
    const response = await adapterClient.post<SubmitDeveloperRatingResponse>(
      adapterConfig.endpoints.projects.submitDeveloperRating(projectId),
      { coordinatorRating },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `submitDeveloperRating(${projectId})`);
  }
}
