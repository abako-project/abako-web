/**
 * Project and Milestone Types
 *
 * Derived from:
 *   - backend/models/seda/project.js (project() and projectsIndex() build the shape)
 *   - backend/models/seda/milestone.js (milestones, milestoneCreate, milestoneUpdate)
 *   - backend/models/seda/proposal.js (proposalCreate, proposalUpdate)
 *   - backend/models/adapter.js (deployProject, getProjectInfo, getAllTasks)
 *   - backend/controllers/project.js (what gets passed to EJS views)
 *   - backend/controllers/milestone.js (milestone form fields)
 *   - backend/models/flowStates.js (project.state and milestone.state raw values)
 *
 * The SEDA project layer enriches the raw adapter response:
 *   - Renames _id to id (and deletes _id, __v)
 *   - Adds .client, .consultant (populated from client/developer indexes)
 *   - Adds .milestones (populated from getAllTasks)
 *   - Adds .objectives and .constraints (currently empty arrays)
 *   - Converts deliveryDate to Date
 */

import type { Client } from './client';
import type { Developer } from './developer';

// ---------------------------------------------------------------------------
// Raw state string values as stored in the backend
// ---------------------------------------------------------------------------

/**
 * The raw `state` field on a project object from the adapter API.
 * These are the string values checked by flowProjectState().
 */
export type ProjectRawState =
  | 'deployed'
  | 'scope_proposed'
  | 'scope_rejected'
  | 'scope_accepted'
  | 'team_assigned'
  | 'completed'
  | 'payment_released'
  | 'rejected_by_coordinator'
  /** Backend transition not yet implemented; reserved for future use. */
  | 'cancelled'
  /** Backend transition not yet implemented; reserved for future use. */
  | 'dispute_open';

/**
 * The raw `state` field on a milestone/task object from the adapter API.
 * These are the string values checked by flowMilestoneState().
 */
export type MilestoneRawState =
  | 'pending'
  | 'waiting_developer_accept_assignation'
  | 'task_in_progress'
  | 'in_review'
  | 'completed'
  | 'rejected'
  | 'paid';

// ---------------------------------------------------------------------------
// Milestone
// ---------------------------------------------------------------------------

/**
 * A milestone (task) within a project.
 *
 * When the milestone is being created in the session scope (not yet persisted),
 * it will NOT have `id`, `state`, or `developerId` fields.
 *
 * Once persisted and returned by getAllTasks, it will have those fields.
 */
export interface Milestone {
  /** Task ID from the adapter API. Undefined for session-only milestones. */
  id?: string;
  title: string;
  description: string;
  /** Raw state from the adapter API. Undefined for session-only milestones. */
  state?: MilestoneRawState;
  /** ID of the assigned developer. Undefined if not yet assigned. */
  developerId?: string;
  /** Populated developer object (joined by SEDA layer). */
  developer?: Developer;
  /** Budget amount for this milestone. */
  budget?: string | number | null;
  /** Delivery time label from the enums (e.g. "Within 1 month"). */
  deliveryTime?: string;
  /** Delivery date as ISO string or timestamp. */
  deliveryDate?: string | number;
  /** Developer role required (e.g. "Front End"). */
  role?: string | null;
  /** Proficiency level required (e.g. "senior"). */
  proficiency?: string | null;
  /** Skills required (e.g. ["Rust", "Javascript"]). */
  skills?: string[];
  /** Availability type required (e.g. "FullTime"). */
  availability?: string;
  /** Hours needed when availability is "WeeklyHours". */
  neededHours?: number;
  /** Documentation links (used in milestone submission flow). */
  documentation?: string;
  /** External links (used in milestone submission flow). */
  links?: string;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

/**
 * A project as built by the SEDA project layer.
 *
 * The shape combines:
 *   - Fields from getProjectInfo() adapter response
 *   - Enrichments added by seda/project.js (client, consultant, milestones, objectives, constraints)
 *   - Proposal fields from proposalCreate/proposalUpdate
 */
export interface Project {
  /** Project ID (renamed from _id by SEDA layer). */
  id: string;
  title: string;
  summary?: string;
  description?: string;
  url?: string;
  /** Raw state string from the adapter API. */
  state?: ProjectRawState;
  /** Creation status from adapter (e.g. "created"). */
  creationStatus?: string;
  /** If the project had a creation error, this will be defined. */
  creationError?: string;
  /** ID of the client who created the proposal. */
  clientId: string;
  /** Populated client object (joined by SEDA layer). */
  client?: Client;
  /** ID of the assigned consultant/coordinator. Undefined if not yet assigned. */
  consultantId?: string;
  /** Populated consultant developer object (joined by SEDA layer). */
  consultant?: Developer;
  /** Contract address on the blockchain. */
  contractAddress?: string;
  /** Calendar contract address. */
  calendarContractAddress?: string;
  /** Milestones (tasks) associated with this project. */
  milestones: Milestone[];
  /** Objectives (currently always empty array). */
  objectives: string[];
  /** Constraints (currently always empty array). */
  constraints: string[];
  /** Budget label from enums (e.g. "$10,000 - $50,000") or index. */
  budget?: string | number;
  /** Delivery time label from enums or index. */
  deliveryTime?: string | number;
  /** Delivery date as Date or timestamp. */
  deliveryDate?: Date | number | string;
  /** Project type label from enums (e.g. "Smart Contract") or index. */
  projectType?: string | number;
  /** Coordinator/consultant approval status. Undefined if not yet reviewed. */
  coordinatorApprovalStatus?: string;
  /** Reason the coordinator rejected the proposal. */
  proposalRejectionReason?: string;
  /** Reason the coordinator rejected the proposal (alternative field name). */
  coordinatorRejectionReason?: string;
  /** Comments attached to the project (e.g., consultant scope comment). */
  comments?: ProjectComment[];
}

/**
 * A comment attached to a project, typically from scope proposals.
 */
export interface ProjectComment {
  consultantComment?: string;
  clientResponse?: string;
}

// ---------------------------------------------------------------------------
// Scope session (draft milestones stored in the session)
// ---------------------------------------------------------------------------

/**
 * The scope draft that the consultant stores in the session
 * while creating milestones before proposing the scope.
 *
 * Maps to req.session.scope in the backend.
 * See backend/controllers/project.js approveProposal.
 */
export interface ScopeSession {
  projectId: string;
  milestones: Milestone[];
}

// ---------------------------------------------------------------------------
// Proposal data (for creating/updating a project proposal)
// ---------------------------------------------------------------------------

/**
 * Data sent when creating a new project proposal.
 * Maps to the body of the proposal form and adapterAPI.deployProject.
 */
export interface ProposalCreateData {
  title: string;
  summary: string;
  description: string;
  url: string;
  projectType: string | number;
  budget: string | number;
  deliveryTime: string | number;
  deliveryDate: string | number;
}

/**
 * Data sent when updating an existing project proposal.
 * Maps to adapterAPI.updateProject.
 */
export interface ProposalUpdateData {
  title?: string;
  summary?: string;
  description?: string;
  url?: string;
  projectType?: string | number;
  budget?: string | number;
  deliveryTime?: string | number;
  deliveryDate?: string | number;
  /** Client's response/feedback to a coordinator rejection. */
  clientResponse?: string;
}

// ---------------------------------------------------------------------------
// Milestone create/update data
// ---------------------------------------------------------------------------

/**
 * Data accepted when creating or updating a milestone.
 * Maps to the milestone form fields in backend/controllers/milestone.js.
 */
export interface MilestoneFormData {
  title: string;
  description: string;
  budget?: string | number | null;
  deliveryTime?: string;
  deliveryDate?: string | number;
  role?: string | null;
  proficiency?: string | null;
  skills?: string[];
  availability?: string;
  neededHours?: number;
}

// ---------------------------------------------------------------------------
// Scope operations
// ---------------------------------------------------------------------------

/**
 * Data sent when proposing a scope.
 * Maps to adapterAPI.proposeScope.
 */
export interface ProposeScopeData {
  milestones: Milestone[];
  advancePaymentPercentage: number;
  documentHash: string;
}
