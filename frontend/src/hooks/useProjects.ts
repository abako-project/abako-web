/**
 * Project Data Hooks
 *
 * React Query hooks wrapping the project service layer.
 * All hooks use direct service calls (no Express backend).
 *
 * Service functions used:
 *   - getProjectsIndex(clientId?, developerId?) -> Project[]
 *   - getProject(projectId) -> Project (enriched with client, consultant, milestones)
 *   - createProposal(clientId, data, token) -> string (projectId)
 *   - updateProposal(projectId, data, token) -> unknown
 *   - rejectProposal(projectId, reason, token) -> void
 *
 * Auth data is fetched from Zustand store (useAuthStore).
 * Enums are built from constants (BUDGETS, DELIVERY_TIMES, PROJECT_TYPES).
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  PROPOSAL_REJECTED,
  COORDINATOR_ASSIGNED,
  TEAM_ASSIGNED,
  CALENDAR_CONTRACT_SET,
} from '@/constants/messages';
import {
  getProjectsIndex,
  getProject,
  createProposal,
  updateProposal,
  rejectProposal,
  assignProjectTeam,
  setProjectCalendarContract,
} from '@/services';
import { assignCoordinator } from '@/api/adapter';
import { useAuthStore } from '@/stores/authStore';
import { BUDGETS, DELIVERY_TIMES, PROJECT_TYPES } from '@/types';
import type {
  Project,
  User,
  ProposalCreateData,
  ProposalUpdateData,
} from '@/types/index';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  dashboard: () => ['dashboard'] as const,
};

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Dashboard response shape. */
export interface DashboardResponse {
  user: User;
  projects: Project[];
  projectsByState: Record<string, Project[]>;
}

/** Project detail response shape. */
export interface ProjectDetailResponse {
  project: Project;
  allBudgets: Array<{ id: number; description: string }>;
  allDeliveryTimes: Array<{ id: number; description: string }>;
  allProjectTypes: Array<{ id: number; description: string }>;
}

/** Create project response shape. */
interface CreateProjectResponse {
  projectId: string;
}

/** Update project response shape. */
interface UpdateProjectResponse {
  projectId: string;
}

/** Approve proposal response shape. */
interface ApproveProposalResponse {
  projectId: string;
  message: string;
}

/** Reject proposal response shape. */
interface RejectProposalResponse {
  projectId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// useProjects
// ---------------------------------------------------------------------------

/**
 * Fetches all projects for the authenticated user.
 *
 * Projects are returned in reverse chronological order (newest first),
 * matching the behavior of the EJS dashboard.
 *
 * Calls: getProjectsIndex(user.clientId, user.developerId)
 */
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const user = useAuthStore.getState().user;

      // Fetch projects using service layer
      const projects = await getProjectsIndex(
        user?.clientId,
        user?.developerId
      );

      // Reverse to show newest first (matching EJS behavior)
      return projects.reverse();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ---------------------------------------------------------------------------
// useDashboard
// ---------------------------------------------------------------------------

/**
 * Fetches dashboard data.
 *
 * Returns the authenticated user info, all their projects, and projects
 * grouped by state for display in the dashboard overview.
 *
 * Calls: getProjectsIndex(user.clientId, user.developerId)
 * Then groups by state locally.
 */
export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: projectKeys.dashboard(),
    queryFn: async () => {
      const user = useAuthStore.getState().user;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch projects using service layer
      const projects = await getProjectsIndex(
        user.clientId,
        user.developerId
      );

      // Reverse to show newest first
      const reversedProjects = projects.reverse();

      // Group projects by state
      const projectsByState: Record<string, Project[]> = {};
      for (const project of reversedProjects) {
        const state = project.state || 'Unknown';
        if (!projectsByState[state]) {
          projectsByState[state] = [];
        }
        projectsByState[state].push(project);
      }

      return {
        user,
        projects: reversedProjects,
        projectsByState,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ---------------------------------------------------------------------------
// useProject
// ---------------------------------------------------------------------------

/**
 * Fetches a single project with full details.
 *
 * The response includes the project with milestones, client, consultant,
 * and the enum reference data (budgets, delivery times, project types).
 *
 * Calls: getProject(id)
 * Enums are built from constants.
 *
 * @param id - The project ID to fetch. When undefined, the query is disabled.
 */
export function useProject(id: string | undefined) {
  return useQuery<ProjectDetailResponse>({
    queryKey: projectKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      // Fetch project using service layer
      const project = await getProject(id);

      // Build enum arrays from constants
      const allBudgets = BUDGETS.map((b, i) => ({ id: i, description: b }));
      const allDeliveryTimes = DELIVERY_TIMES.map((d, i) => ({ id: i, description: d }));
      const allProjectTypes = PROJECT_TYPES.map((p, i) => ({ id: i, description: p }));

      return {
        project,
        allBudgets,
        allDeliveryTimes,
        allProjectTypes,
      };
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ---------------------------------------------------------------------------
// useCreateProject
// ---------------------------------------------------------------------------

/**
 * Mutation for creating a new project proposal.
 *
 * Only clients can create proposals.
 * On success, invalidates the projects list and dashboard queries
 * so they refetch with the new project included.
 *
 * Calls: createProposal(user.clientId, data, token)
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<CreateProjectResponse, Error, ProposalCreateData>({
    mutationFn: async (data: ProposalCreateData) => {
      const { user, token } = useAuthStore.getState();

      if (!user?.clientId) {
        throw new Error('Client ID not found. Only clients can create proposals.');
      }

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Call service layer
      const projectId = await createProposal(user.clientId, data, token);

      return { projectId };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateProject
// ---------------------------------------------------------------------------

/** Input for the update mutation: project ID + partial proposal data. */
interface UpdateProjectInput {
  id: string;
  data: ProposalUpdateData;
}

/**
 * Mutation for updating an existing project proposal.
 *
 * On success, invalidates the project detail, projects list, and dashboard queries.
 *
 * Calls: updateProposal(projectId, data, token)
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProjectResponse, Error, UpdateProjectInput>({
    mutationFn: async ({ id, data }: UpdateProjectInput) => {
      const { token } = useAuthStore.getState();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Call service layer
      await updateProposal(id, data, token);

      return { projectId: id };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useApproveProposal
// ---------------------------------------------------------------------------

/**
 * Mutation for approving a project proposal.
 *
 * Used by consultants to approve a client's project proposal.
 * On success, invalidates the relevant queries.
 *
 * The old backend's seda.approveProposal() was a no-op (empty function).
 * The real action was initializing req.session.scope, which the caller
 * handles via the onSuccess callback by setting local scope state.
 */
export function useApproveProposal() {
  const queryClient = useQueryClient();

  return useMutation<ApproveProposalResponse, Error, string>({
    mutationFn: async (projectId: string) => {
      return {
        projectId,
        message: 'Proposal approved',
      };
    },
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useRejectProposal
// ---------------------------------------------------------------------------

/** Input for the reject mutation: project ID + optional rejection reason. */
interface RejectProposalInput {
  projectId: string;
  proposalRejectionReason?: string;
}

/**
 * Mutation for rejecting a project proposal.
 *
 * Used by consultants to reject a client's project proposal.
 * On success, invalidates the relevant queries.
 *
 * Calls: rejectProposal(projectId, reason, token)
 */
export function useRejectProposal() {
  const queryClient = useQueryClient();

  return useMutation<RejectProposalResponse, Error, RejectProposalInput>({
    mutationFn: async ({ projectId, proposalRejectionReason }: RejectProposalInput) => {
      const { token } = useAuthStore.getState();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Call service layer
      await rejectProposal(
        projectId,
        proposalRejectionReason || '',
        token
      );

      return {
        projectId,
        message: PROPOSAL_REJECTED,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useAssignCoordinator
// ---------------------------------------------------------------------------

/** Input for the assign coordinator mutation. */
interface AssignCoordinatorInput {
  contractAddress: string;
}

/** Response shape for assign coordinator. */
interface AssignCoordinatorResponse {
  contractAddress: string;
  message: string;
}

/**
 * Mutation for assigning a coordinator to a project.
 *
 * On success, invalidates the project detail, list, and dashboard queries.
 */
export function useAssignCoordinator() {
  const queryClient = useQueryClient();

  return useMutation<AssignCoordinatorResponse, Error, AssignCoordinatorInput>({
    mutationFn: async ({ contractAddress }: AssignCoordinatorInput) => {
      const { token } = useAuthStore.getState();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      await assignCoordinator(contractAddress, token);

      return {
        contractAddress,
        message: COORDINATOR_ASSIGNED,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.contractAddress),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useAssignTeam
// ---------------------------------------------------------------------------

/** Input for the assign team mutation. */
interface AssignTeamInput {
  contractAddress: string;
  teamSize: number;
}

/** Response shape for assign team. */
interface AssignTeamResponse {
  contractAddress: string;
  message: string;
}

/**
 * Mutation for assigning a team to a project.
 *
 * On success, invalidates the project detail, list, and dashboard queries.
 */
export function useAssignTeam() {
  const queryClient = useQueryClient();

  return useMutation<AssignTeamResponse, Error, AssignTeamInput>({
    mutationFn: async ({ contractAddress, teamSize }: AssignTeamInput) => {
      const { token } = useAuthStore.getState();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      await assignProjectTeam(contractAddress, teamSize, token);

      return {
        contractAddress,
        message: TEAM_ASSIGNED,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.contractAddress),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useSetCalendarContract
// ---------------------------------------------------------------------------

/** Input for the set calendar contract mutation. */
interface SetCalendarContractInput {
  contractAddress: string;
  calendarContractAddress: string;
}

/** Response shape for set calendar contract. */
interface SetCalendarContractResponse {
  contractAddress: string;
  message: string;
}

/**
 * Mutation for setting a calendar contract on a project.
 *
 * On success, invalidates the project detail query.
 */
export function useSetCalendarContract() {
  const queryClient = useQueryClient();

  return useMutation<SetCalendarContractResponse, Error, SetCalendarContractInput>({
    mutationFn: async ({
      contractAddress,
      calendarContractAddress,
    }: SetCalendarContractInput) => {
      const { token } = useAuthStore.getState();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      await setProjectCalendarContract(
        contractAddress,
        calendarContractAddress,
        token
      );

      return {
        contractAddress,
        message: CALENDAR_CONTRACT_SET,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.contractAddress),
      });
    },
  });
}
