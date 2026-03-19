/**
 * API Configuration
 * Direct connection to external APIs (no backend proxy needed).
 * All APIs live under VITE_API_BASE_URL (defaults to dev.abako.xyz).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev.abako.xyz';

const CALENDAR_ADDRESS = import.meta.env.VITE_CALENDAR_ADDRESS || 'Dd34LSU53MLwJpq4wfHmDFwAifJrcaPbd1qTCGZcR7iXQkd';

// ---------------------------------------------------------------------------
// Adapter API (NestJS) - Clients, Developers, Projects, Milestones, Calendar
// ---------------------------------------------------------------------------

export const adapterConfig = {
  baseURL: `${BASE_URL}/adapter/v1`,
  endpoints: {
    auth: {
      checkRegistered: (id: string) => `/auth/check-registered/${id}`,
      customRegister: '/auth/custom-register',
      customConnect: '/auth/custom-connect',
      sign: '/auth/sign',
    },
    clients: {
      create: '/clients',
      list: '/clients',
      get: (id: string) => `/clients/${id}`,
      update: (id: string) => `/clients/${id}`,
      attachment: (id: string) => `/clients/${id}/attachment`,
      projects: (id: string) => `/clients/${id}/projects`,
    },
    developers: {
      create: '/developers',
      list: '/developers',
      get: (id: string) => `/developers/${id}`,
      update: (id: string) => `/developers/${id}`,
      attachment: (id: string) => `/developers/${id}/attachment`,
      projects: (id: string) => `/developers/${id}/projects`,
      milestones: (id: string) => `/developers/${id}/milestones`,
    },
    projects: {
      update: (addr: string) => `/projects/${addr}`,
      deploy: (version: string) => `/projects/deploy/${version}`,
      assignCoordinator: (addr: string) => `/projects/${addr}/assign_coordinator`,
      assignTeam: (addr: string) => `/projects/${addr}/assign_team`,
      markCompleted: (addr: string) => `/projects/${addr}/mark_completed`,
      submitCoordinatorRatings: (addr: string) => `/projects/${addr}/submit_coordinator_ratings`,
      submitDeveloperRating: (addr: string) => `/projects/${addr}/submit_developer_rating`,
      setCalendarContract: (addr: string) => `/projects/${addr}/set_calendar_contract`,
      proposeScope: (id: string) => `/projects/${id}/propose_scope`,
      approveScope: (id: string) => `/projects/${id}/approve_scope`,
      rejectScope: (id: string) => `/projects/${id}/reject_scope`,
      coordinatorReject: (addr: string) => `/projects/${addr}/coordinator_reject`,
      submitTaskForReview: (id: string) => `/projects/${id}/submit_task_for_review`,
      completeTask: (id: string) => `/projects/${id}/complete_task`,
      rejectTask: (projectId: string, milestoneId: string) =>
        `/projects/${projectId}/milestones/${milestoneId}/reject`,
      getProjectInfo: (id: string) => `/projects/${id}/get_project_info`,
      getTeam: (addr: string) => `/projects/${addr}/get_team`,
      getScopeInfo: (id: string) => `/projects/${id}/get_scope_info`,
      getTask: (addr: string) => `/projects/${addr}/get_task`,
      getTaskCompletion: (addr: string) => `/projects/${addr}/get_task_completion_status`,
      getAllTasks: (id: string) => `/projects/${id}/get_all_tasks`,
      milestones: {
        list: (projectId: string) => `/projects/${projectId}/milestones`,
        create: (projectId: string) => `/projects/${projectId}/milestones`,
        get: (projectId: string, milestoneId: string) =>
          `/projects/${projectId}/milestones/${milestoneId}`,
        update: (projectId: string, milestoneId: string) =>
          `/projects/${projectId}/milestones/${milestoneId}`,
        remove: (projectId: string, milestoneId: string) =>
          `/projects/${projectId}/milestones/${milestoneId}`,
      },
    },
    ratings: {
      byClient: (clientId: string) => `/ratings/client/${clientId}`,
      byDeveloper: (developerId: string) => `/ratings/developer/${developerId}`,
      byProject: (projectId: string) => `/ratings/project/${projectId}`,
    },
    bramp: {
      createUser: '/bramp/users',
      getUserByEmail: '/bramp/users',
      requestDeposit: '/bramp/deposit',
      confirmDeposit: (depositId: string) => `/bramp/deposit/${depositId}/confirm`,
      createWithdrawal: '/bramp/withdrawal',
    },
    calendar: {
      deploy: (version: string) => `/calendar/deploy/${version}`,
      registerWorker: `/calendar/${CALENDAR_ADDRESS}/register_worker`,
      registerWorkers: `/calendar/${CALENDAR_ADDRESS}/register_workers`,
      setAvailability: `/calendar/${CALENDAR_ADDRESS}/set_availability`,
      adminSetAvailability: `/calendar/${CALENDAR_ADDRESS}/admin_set_worker_availability`,
      getAvailabilityHours: `/calendar/${CALENDAR_ADDRESS}/get_availability_hours`,
      isAvailable: `/calendar/${CALENDAR_ADDRESS}/is_available`,
      getAvailableWorkers: `/calendar/${CALENDAR_ADDRESS}/get_available_workers`,
      getRegisteredWorkers: `/calendar/${CALENDAR_ADDRESS}/get_registered_workers`,
      getAllWorkersAvailability: `/calendar/${CALENDAR_ADDRESS}/get_all_workers_availability`,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Virto API (WebAuthn, Payments, Memberships)
// ---------------------------------------------------------------------------

export const virtoConfig = {
  baseURL: BASE_URL,
  endpoints: {
    attestation: '/api/attestation',
    register: '/api/register',
    assertion: '/api/assertion',
    checkUserRegistered: '/api/check-user-registered',
    getUserAddress: '/api/get-user-address',
    fund: '/api/fund',
    addMember: '/api/add-member',
    isMember: '/api/is-member',
    payments: {
      create: '/api/payments/create',
      release: '/api/payments/release',
      acceptAndPay: '/api/payments/accept-and-pay',
      get: '/api/payments/get',
      health: '/api/payments/health',
    },
    memberships: {
      address: (communityId: string) => `/api/memberships/${communityId}/address`,
      members: (communityId: string) => `/api/memberships/${communityId}/members`,
      member: (communityId: string, membershipId: string) =>
        `/api/memberships/${communityId}/members/${membershipId}`,
      check: (communityId: string, address: string) =>
        `/api/memberships/${communityId}/members/${address}/check`,
      remove: (communityId: string, address: string) =>
        `/api/memberships/${communityId}/members/${address}`,
      health: '/api/memberships/health',
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Contracts API (Smart Contracts)
// ---------------------------------------------------------------------------

export const contractsConfig = {
  baseURL: BASE_URL,
  endpoints: {
    health: '/health',
    projects: {
      constructors: '/projects/constructors',
      query: (address: string, method: string) => `/projects/query/${address}/${method}`,
      call: (address: string, method: string) => `/projects/call/${address}/${method}`,
      deploy: {
        v5: '/projects/deploy/v5',
        v6: '/projects/deploy/v6',
      },
    },
    calendar: {
      constructors: '/calendar/constructors',
      query: (method: string) => `/calendar/query/${CALENDAR_ADDRESS}/${method}`,
      call: (method: string) => `/calendar/call/${CALENDAR_ADDRESS}/${method}`,
      deploy: '/calendar/deploy/v5',
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Shared config
// ---------------------------------------------------------------------------

export const API_TIMEOUT = 160000;

export const CALENDAR_CONTRACT_ADDRESS = CALENDAR_ADDRESS;
