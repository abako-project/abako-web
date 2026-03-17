/**
 * Project and Milestone State Machines
 *
 * TypeScript port of backend/models/flowStates.js.
 *
 * This module determines the logical flow state of projects and milestones
 * based on their raw data fields (state, creationError, consultantId, etc.).
 *
 * The backend version was bug-fixed in Phase 0:
 *   - No ToBeDone state
 *   - No if(true) short-circuit
 *   - "paid" (not "ALGO") for milestone paid state
 *
 * This port preserves those fixes.
 */

import type { Project, Milestone, ScopeSession } from '@/types/index';

// ---------------------------------------------------------------------------
// Project States
// ---------------------------------------------------------------------------

/**
 * All possible logical states a project can be in.
 * Each value maps to a UI-level concept in the workflow.
 */
export const ProjectState = {
  /** An error occurred when trying to create the client's proposal. */
  CreationError: 'CreationError',

  /** The client submitted the project proposal, but the DAO has not assigned a consultant yet. */
  ProposalPending: 'ProposalPending',

  /**
   * The DAO assigned a consultant to the pending proposal.
   * Waiting for the consultant to accept or reject the proposal.
   */
  WaitingForProposalApproval: 'WaitingForProposalApproval',

  /** The consultant rejected the client's proposal. */
  ProposalRejected: 'ProposalRejected',

  /** The consultant is creating milestones (defining the scope). */
  ScopingInProgress: 'ScopingInProgress',

  /** The consultant published the scope; waiting for the client to validate it. */
  ScopeValidationNeeded: 'ScopeValidationNeeded',

  /** The client rejected the proposed scope. */
  ScopeRejected: 'ScopeRejected',

  /** The consultant must request that the development team be assigned. */
  WaitingForTeamAssigment: 'WaitingForTeamAssigment',

  /**
   * The team has been assigned and the project is in progress.
   * Each milestone evolves with its own state machine.
   */
  ProjectInProgress: 'ProjectInProgress',

  /** Payment has been released for the project. */
  PaymentReleased: 'PaymentReleased',

  /** Project delivered, accepted, voted on, and paid. */
  Completed: 'completed',

  /**
   * The project was cancelled before completion.
   * Mapped from raw state 'cancelled'.
   * Backend endpoints for this transition are not yet implemented.
   */
  Cancelled: 'Cancelled',

  /**
   * A dispute has been opened on the project.
   * Mapped from raw state 'dispute_open'.
   * Backend endpoints for this transition are not yet implemented.
   */
  DisputeOpen: 'DisputeOpen',

  /** Invalid or unrecognized state. */
  Invalid: 'Invalid',
} as const;

export type ProjectStateValue = (typeof ProjectState)[keyof typeof ProjectState];

// ---------------------------------------------------------------------------
// Milestone States
// ---------------------------------------------------------------------------

/**
 * All possible logical states a milestone can be in.
 */
export const MilestoneState = {
  /** The consultant is creating the milestone; it is stored in the session only. */
  CreatingMilestone: 'CreatingMilestone',

  /**
   * The DAO has not yet assigned a developer to this milestone.
   * The milestone has been created, but the scope may not have been accepted yet,
   * or it has been accepted but still has no developer.
   */
  WaitingDeveloperAssignation: 'WaitingDeveloperAssignation',

  /**
   * The DAO assigned a developer to the milestone; waiting for the developer
   * to accept the assignation.
   * Corresponds to the commented-out state in the backend flow model.
   * Mapped from raw state 'waiting_developer_accept_assignation'.
   */
  WaitingDeveloperAcceptAssignation: 'WaitingDeveloperAcceptAssignation',

  /** The developer has accepted the milestone and work has begun. */
  MilestoneInProgress: 'MilestoneInProgress',

  /** The consultant submitted the milestone for client review; awaiting the client's decision. */
  WaitingClientAcceptSubmission: 'WaitingClientAcceptSubmission',

  /** The client rejected the submitted work. */
  SubmissionRejectedByClient: 'SubmissionRejectedByClient',

  /** The milestone work has been completed and accepted by the client. */
  MilestoneCompleted: 'MilestoneCompleted',

  /**
   * The milestone is awaiting payment to the developer.
   * NOTE: This state is reserved for future use. The current backend flow
   * transitions milestones directly from MilestoneCompleted to Paid without
   * passing through an intermediate AwaitingPayment state. No raw state
   * mapping exists for it yet; retaining the value prevents breaking changes
   * when the backend implements the intermediate payment step.
   */
  AwaitingPayment: 'AwaitingPayment',

  /** The milestone has been paid to the developer. */
  Paid: 'Paid',

  /** Invalid or unrecognized state. */
  Invalid: 'Invalid',
} as const;

export type MilestoneStateValue = (typeof MilestoneState)[keyof typeof MilestoneState];

// ---------------------------------------------------------------------------
// Flow functions
// ---------------------------------------------------------------------------

/**
 * Determines the logical flow state of a project.
 *
 * @param project - The project data object.
 * @param scope - Optional scope session draft stored by the consultant.
 *   Do not pass this parameter when no scope draft exists.
 * @returns The current logical state of the project.
 */
export function flowProjectState(
  project: Project,
  scope?: ScopeSession
): ProjectStateValue {

  // Creation error takes priority over everything
  if (typeof project.creationError !== 'undefined') {
    return ProjectState.CreationError;
  }

  // No consultant assigned yet means the proposal is pending DAO review
  if (typeof project.consultantId === 'undefined') {
    return ProjectState.ProposalPending;
  }

  // Consultant rejected the proposal
  if (project.state === 'rejected_by_coordinator') {
    // If the consultant has started a new scope draft after reviewing the
    // client's resubmitted proposal, treat this as ScopingInProgress so
    // the scope builder can render.
    if (scope && scope.projectId === project.id) {
      return ProjectState.ScopingInProgress;
    }
    return ProjectState.ProposalRejected;
  }

  // Project is deployed (the initial raw state after the contract is created)
  if (project.state === 'deployed') {

    // No coordinator approval status yet
    if (typeof project.coordinatorApprovalStatus === 'undefined') {
      // No active scope draft for this project AND all milestones lack IDs
      // (meaning no milestones have been created on the backend yet)
      if (typeof scope === 'undefined' || scope.projectId !== project.id) {
        if (project.milestones.every(milestone => !milestone.id)) {
          return ProjectState.WaitingForProposalApproval;
        }
      }
    }

    return ProjectState.ScopingInProgress;
  }

  // Scope has been proposed; waiting for client validation
  if (project.state === 'scope_proposed') {
    return ProjectState.ScopeValidationNeeded;
  }

  // Client rejected the scope
  if (project.state === 'scope_rejected') {
    return ProjectState.ScopeRejected;
  }

  // Scope accepted; waiting for team assignment
  if (project.state === 'scope_accepted') {
    return ProjectState.WaitingForTeamAssigment;
  }

  // Team has been assigned; project is in progress
  if (project.state === 'team_assigned') {
    return ProjectState.ProjectInProgress;
  }

  // Project has been completed
  if (project.state === 'completed') {
    return ProjectState.Completed;
  }

  // Payment has been released
  if (project.state === 'payment_released') {
    return ProjectState.PaymentReleased;
  }

  // Project was cancelled (backend transition not yet implemented)
  if (project.state === 'cancelled') {
    return ProjectState.Cancelled;
  }

  // A dispute has been opened (backend transition not yet implemented)
  if (project.state === 'dispute_open') {
    return ProjectState.DisputeOpen;
  }

  return ProjectState.Invalid;
}

/**
 * Determines the logical flow state of a milestone.
 *
 * @param milestone - The milestone data object.
 * @returns The current logical state of the milestone.
 */
export function flowMilestoneState(milestone: Milestone): MilestoneStateValue {

  // No state means the milestone is being created in the session (not yet persisted)
  if (typeof milestone.state === 'undefined') {
    return MilestoneState.CreatingMilestone;
  }

  if (milestone.state === 'pending') {
    return MilestoneState.WaitingDeveloperAssignation;
  }

  if (milestone.state === 'waiting_developer_accept_assignation') {
    return MilestoneState.WaitingDeveloperAcceptAssignation;
  }

  if (milestone.state === 'task_in_progress') {
    return MilestoneState.MilestoneInProgress;
  }

  if (milestone.state === 'in_review') {
    return MilestoneState.WaitingClientAcceptSubmission;
  }

  if (milestone.state === 'completed') {
    return MilestoneState.MilestoneCompleted;
  }

  if (milestone.state === 'rejected') {
    return MilestoneState.SubmissionRejectedByClient;
  }

  if (milestone.state === 'paid') {
    return MilestoneState.Paid;
  }

  return MilestoneState.Invalid;
}
