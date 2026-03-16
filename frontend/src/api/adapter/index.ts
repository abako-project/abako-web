/**
 * Adapter API Barrel Export
 *
 * Re-exports all adapter API methods from a single entry point.
 * This is the TypeScript port of backend/models/adapter.js adapterAPI object.
 *
 * Import example:
 *   import { getClients, getDevelopers, deployProject } from '@/api/adapter';
 */

// Auth operations
export {
  checkRegistered,
  customRegister,
  customConnect,
  sign,
} from './auth';

// Client operations
export {
  getClients,
  getClient,
  createClient,
  updateClient,
  getClientAttachment,
  getClientProjects,
  findClientByEmail,
} from './clients';

// Developer operations
export {
  getDevelopers,
  getDeveloper,
  createDeveloper,
  updateDeveloper,
  getDeveloperAttachment,
  getDeveloperProjects,
  getDeveloperMilestones,
  findDeveloperByEmail,
} from './developers';

// Project operations
export {
  deployProject,
  assignCoordinator,
  assignTeam,
  markCompleted,
  setCalendarContract,
  proposeScope,
  approveScope,
  rejectScope,
  submitTaskForReview,
  completeTask,
  rejectTask,
  getProject,
  getProjectInfo,
  getTeam,
  getScopeInfo,
  getTask,
  getTaskCompletionStatus,
  getAllTasks,
  updateProject,
  coordinatorRejectProject,
  submitCoordinatorRatings,
  submitDeveloperRating,
} from './projects';
export type { ApproveScopeResponse } from './projects';

// Milestone operations
export {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from './milestones';

// Rating operations
export {
  getRatingsByClient,
  getRatingsByDeveloper,
  getRatingsByProject,
} from './ratings';

// Bramp on/off-ramp operations
export {
  createBrampUser,
  getBrampUserByEmail,
  requestDeposit,
  confirmDeposit,
  createWithdrawal,
} from './bramp';
export type {
  BrampUser,
  DepositResponse,
  ConfirmDepositResponse,
  WithdrawalResponse,
} from './bramp';

// Calendar operations
export {
  registerWorker,
  setAvailability,
  registerWorkers,
  adminSetWorkerAvailability,
  getAvailabilityHours,
  isAvailable,
  getAvailableWorkers,
  getRegisteredWorkers,
  getAllWorkersAvailability,
  deployCalendar,
} from './calendar';
