/**
 * Payment Types
 *
 * Derived from:
 *   - backend/controllers/payment.js (advancePaymentPercentage, payment flow)
 *   - backend/views/payments/__paymentGridProject.ejs (payment calculations)
 *   - backend/routes/api/payments.js (API response shapes)
 *   - backend/models/flowStates.js (milestone states that determine payment status)
 *
 * The payment system works by categorizing milestones into payment groups:
 *   - Zero-paid: milestones not yet started (CreatingMilestone, WaitingDeveloperAssignation)
 *   - Advance-paid: milestones in progress (advance payment % of budget)
 *   - Fully-paid: completed milestones
 *
 * Payment totals are computed client-side from milestone data, mirroring
 * the EJS template logic.
 */

import type { Project } from './project';

// ---------------------------------------------------------------------------
// API Response types
// ---------------------------------------------------------------------------

/**
 * Shape returned by GET /api/payments (after unwrapping { success, data }).
 *
 * Contains all the user's projects with milestones, the advance payment
 * percentage, and delivery time enum data.
 */
export interface PaymentsResponse {
  projects: Project[];
  advancePaymentPercentage: number;
  allDeliveryTimes: Array<{ id: number; description: string }>;
}

/**
 * Shape returned by GET /api/payments/:projectId (after unwrapping).
 */
export interface PaymentDetailResponse {
  project: Project;
  advancePaymentPercentage: number;
  allDeliveryTimes: Array<{ id: number; description: string }>;
}

/**
 * Shape returned by POST /api/payments/:projectId/release (after unwrapping).
 */
export interface ReleasePaymentResponse {
  projectId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Computed payment summary (used by frontend components)
// ---------------------------------------------------------------------------

/**
 * Payment summary for a single project.
 * Computed client-side from milestone data using the advance payment percentage.
 */
export interface ProjectPaymentSummary {
  /** The project this summary is for. */
  project: Project;
  /** Total budget across all milestones. */
  totalBudgetFunded: number;
  /** Total advance payments for in-progress milestones. */
  paymentInAdvanced: number;
  /** Total payments for completed/paid milestones. */
  paymentForCompleted: number;
  /** Remaining funds (total - advanced - completed). */
  fundsRemaining: number;
  /** Count of milestones awaiting payment. */
  awaitingPaymentCount: number;
  /** Count of milestones that have been paid. */
  paidCount: number;
  /** Total amount deposited in escrow (0 if scope not yet accepted). */
  escrowDeposited: number;
}

// ---------------------------------------------------------------------------
// Vote types (used by the voting/rating flow)
// ---------------------------------------------------------------------------

/**
 * A team member available for rating.
 * Returned by GET /api/votes/:projectId.
 */
export interface VoteMember {
  name: string;
  role: string | null;
  proficiency: string | null;
  userId: string | null;
  email: string | null;
  imageUrl: string;
}

/**
 * Shape returned by GET /api/votes/:projectId (after unwrapping).
 */
export interface VotesResponse {
  project: {
    id: string;
    title: string;
    state: string;
  };
  members: VoteMember[];
}

/**
 * A single vote entry sent in the POST body.
 */
export interface VoteEntry {
  userId: string;
  score: number;
}

/**
 * Shape returned by POST /api/votes/:projectId (after unwrapping).
 */
export interface SubmitVotesResponse {
  projectId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Cross-rating submission types
// ---------------------------------------------------------------------------

/**
 * Input for submitting coordinator ratings (coordinator rates client + team).
 */
export interface SubmitCoordinatorRatingsInput {
  projectId: string;
  clientRating: number;
  teamRatings: Array<[string, number]>;
}

/**
 * Response from submitting coordinator ratings.
 */
export interface SubmitCoordinatorRatingsResponse {
  projectId: string;
  message: string;
}

/**
 * Input for submitting developer rating (developer rates coordinator).
 */
export interface SubmitDeveloperRatingInput {
  projectId: string;
  coordinatorRating: number;
}

/**
 * Response from submitting developer rating.
 */
export interface SubmitDeveloperRatingResponse {
  projectId: string;
  message: string;
}
