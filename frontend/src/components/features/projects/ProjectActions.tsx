/**
 * ProjectActions - Renders action buttons based on project state and user role
 *
 * Handles:
 * - Consultant: approve/reject proposal (WaitingForProposalApproval)
 * - Consultant: submit scope (ScopingInProgress, ScopeRejected)
 * - Client: accept/reject scope (ScopeValidationNeeded)
 * - Client: edit proposal (ProposalRejected)
 * - Consultant: assign team (WaitingForTeamAssigment)
 * - Status messages for other states
 *
 * Mirrors the EJS partials in projects/actions/body/*.ejs.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Avatar, TextArea } from '@components/ui';
import { useApproveProposal, useRejectProposal, useAssignTeam, useUpdateProject } from '@hooks/useProjects';
import {
  flowProjectState,
  ProjectState,
} from '@lib/flowStates';
import type { Project, ScopeSession, User } from '@/types/index';

interface ProjectActionsProps {
  project: Project;
  user: User;
  scope?: ScopeSession;
  /** Called when the scope builder should be shown. */
  onShowScopeBuilder?: () => void;
  /** Called when the consultant approves the proposal. */
  onApproveProposal?: (projectId: string) => void;
  /** Called when the client wants to edit the rejected proposal. */
  onEditProposal?: () => void;
  /** Whether the proposal is currently being edited inline. */
  isEditingProposal?: boolean;
}

export function ProjectActions({
  project,
  user,
  scope,
  onShowScopeBuilder,
  onApproveProposal,
  onEditProposal,
  isEditingProposal,
}: ProjectActionsProps) {
  const state = flowProjectState(project, scope);

  const isConsultant =
    !!user.developerId && String(user.developerId) === String(project.consultantId);
  const isClient =
    !!user.clientId && String(user.clientId) === String(project.clientId);
  const isDeveloper =
    !!user.developerId &&
    !isConsultant &&
    project.milestones.some((m) => String(m.developerId) === String(user.developerId));

  const allMilestonesCompleted =
    project.milestones.length > 0 &&
    project.milestones.every((m) => m.state === 'completed' || m.state === 'paid');

  return (
    <div className="space-y-4">
      {/* Consultant: Approve or Reject Proposal */}
      {/* Also shown in ProposalRejected state so the consultant can re-approve
          after the client edits and resubmits the proposal. */}
      {isConsultant &&
        (state === ProjectState.WaitingForProposalApproval ||
          state === ProjectState.ProposalRejected) && (
          <ConsultantProposalActions projectId={project.id} project={project} onApproveProposal={onApproveProposal} />
        )}

      {/* Consultant: Scope in progress - show scope builder link */}
      {isConsultant &&
        (state === ProjectState.ScopingInProgress ||
          state === ProjectState.ScopeRejected) && (
          <ScopingActions
            onShowScopeBuilder={onShowScopeBuilder}
            isScopeRejected={state === ProjectState.ScopeRejected}
          />
        )}

      {/* Consultant: Waiting for team assignment */}
      {isConsultant &&
        state === ProjectState.WaitingForTeamAssigment && (
          <ConsultantAssignTeam projectId={project.id} />
        )}

      {/* Client: Proposal Rejected - can edit and resubmit */}
      {isClient && state === ProjectState.ProposalRejected && (
        <ProposalRejectedInfo
          project={project}
          onEditProposal={onEditProposal}
          isEditingProposal={isEditingProposal}
        />
      )}

      {/* Client: Scope Validation Needed - accept or reject */}
      {isClient && state === ProjectState.ScopeValidationNeeded && (
        <ClientScopeResponse project={project} />
      )}

      {/* Client: Proposal Pending */}
      {isClient && state === ProjectState.ProposalPending && (
        <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5">
          <div className="flex items-center gap-2 text-sm text-[#9B9B9B]">
            <i className="ri-time-line text-yellow-400" />
            <span>
              Your proposal is pending review. You will be notified once a
              consultant has been assigned.
            </span>
          </div>
        </div>
      )}

      {/* Project In Progress: client navigates to evaluation page when all milestones done */}
      {state === ProjectState.ProjectInProgress && (
        allMilestonesCompleted && isClient ? (
          <ProjectCompletionPrompt projectId={project.id} />
        ) : (
          <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5">
            <div className="flex items-center gap-2 text-sm text-[#36D399]">
              <i className="ri-play-circle-line" />
              <span>
                {allMilestonesCompleted && isConsultant
                  ? 'All milestones have been completed. Waiting for the client to finalize the project and release payments.'
                  : 'Project is in progress. Check milestones for individual task status.'}
              </span>
            </div>
          </div>
        )
      )}

      {/* Completed: show evaluation prompts per role + client release payment */}
      {state === ProjectState.Completed && (
        <>
          {isConsultant && (
            <ConsultantEvaluationPrompt projectId={project.id} />
          )}
          {isDeveloper && (
            <DeveloperEvaluationPrompt projectId={project.id} />
          )}
          {isClient && (
            <>
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <i className="ri-checkbox-circle-line" />
                  <span>
                    This project has been completed successfully.
                  </span>
                </div>
              </div>
              <ClientReleasePayment project={project} />
            </>
          )}
          {!isConsultant && !isDeveloper && !isClient && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <i className="ri-checkbox-circle-line" />
                <span>
                  This project has been completed successfully.
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Released: developer can claim, others see info */}
      {state === ProjectState.PaymentReleased && (
        isDeveloper ? (
          <DeveloperClaimPayment project={project} />
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <i className="ri-money-dollar-circle-line" />
              <span>
                Payment has been released for this project.
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Consultant proposal approval/rejection section.
 *
 * Layout matches Figma node 1441:14207 — Project Leader Rejection:
 *   - "Your Review" panel header with reviewer avatar
 *   - Accept / Reject toggle tabs
 *   - When Reject is active: required textarea + client email copy
 *   - Submit Review button (disabled until form is valid)
 */
function ConsultantProposalActions({
  projectId,
  project,
  onApproveProposal,
}: {
  projectId: string;
  project: Project;
  onApproveProposal?: (projectId: string) => void;
}) {
  type ReviewDecision = 'accept' | 'reject' | null;

  const [decision, setDecision] = useState<ReviewDecision>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();

  const isMutating = approveMutation.isPending || rejectMutation.isPending;
  const consultantName = project.consultant?.name ?? 'You';
  const clientEmail = project.client?.email;

  const handleCopyEmail = useCallback((email: string) => {
    void navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }).catch(() => {
      // silent fail — clipboard not available
    });
  }, []);

  const handleApprove = useCallback(() => {
    approveMutation.mutate(projectId, {
      onSuccess: () => {
        onApproveProposal?.(projectId);
      },
    });
  }, [approveMutation, projectId, onApproveProposal]);

  const handleReject = useCallback(() => {
    if (!rejectionReason.trim()) return;
    rejectMutation.mutate({
      projectId,
      proposalRejectionReason: rejectionReason,
    });
  }, [rejectMutation, projectId, rejectionReason]);

  const handleSubmit = useCallback(() => {
    if (decision === 'accept') {
      handleApprove();
    } else if (decision === 'reject') {
      handleReject();
    }
  }, [decision, handleApprove, handleReject]);

  const isSubmitDisabled =
    isMutating ||
    decision === null ||
    (decision === 'reject' && !rejectionReason.trim());

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#3D3D3D]">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={
              project.consultant?.id
                ? `/developers/${project.consultant.id}/attachment`
                : undefined
            }
            alt={consultantName}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F5F5F5] truncate">
              Your Review
            </p>
            <p className="text-xs text-[#9B9B9B] truncate">{consultantName}</p>
          </div>
        </div>

        {/* Accept / Reject tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-1">
          <button
            type="button"
            onClick={() => setDecision(decision === 'accept' ? null : 'accept')}
            disabled={isMutating}
            aria-pressed={decision === 'accept'}
            className={
              decision === 'accept'
                ? 'rounded-[6px] bg-[#36D399]/20 px-3 py-1 text-xs font-medium text-[#36D399] transition-colors'
                : 'rounded-[6px] px-3 py-1 text-xs font-medium text-[#9B9B9B] transition-colors hover:text-[#F5F5F5] disabled:pointer-events-none disabled:opacity-50'
            }
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => setDecision(decision === 'reject' ? null : 'reject')}
            disabled={isMutating}
            aria-pressed={decision === 'reject'}
            className={
              decision === 'reject'
                ? 'rounded-[6px] bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition-colors'
                : 'rounded-[6px] px-3 py-1 text-xs font-medium text-[#9B9B9B] transition-colors hover:text-[#F5F5F5] disabled:pointer-events-none disabled:opacity-50'
            }
          >
            Reject
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className="p-5 space-y-4">
        {/* Rejection form — shown when Reject tab is active */}
        {decision === 'reject' && (
          <div className="space-y-2">
            <p className="text-xs text-[#9B9B9B]">
              Provide an explanation of your rejection.
            </p>
            <TextArea
              id="consultant-rejection-reason"
              name="consultant-rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Type here your commentary (required)"
              rows={4}
              disabled={isMutating}
            />
          </div>
        )}

        {/* Accept confirmation message */}
        {decision === 'accept' && (
          <div className="flex items-start gap-2 rounded-[8px] border border-[#36D399]/30 bg-[#36D399]/10 px-3 py-3">
            <i className="ri-checkbox-circle-line mt-0.5 shrink-0 text-[#36D399]" aria-hidden="true" />
            <p className="text-xs text-[#36D399]">
              You are about to approve this proposal. The project will move to the scoping phase.
            </p>
          </div>
        )}

        {/* No decision selected — hint */}
        {decision === null && (
          <p className="text-xs text-[#9B9B9B]">
            Select Accept or Reject above to submit your review.
          </p>
        )}

        {/* Client contact section */}
        {clientEmail && (
          <div className="flex items-start gap-2 rounded-[8px] border border-[#3D3D3D] px-3 py-3">
            <i className="ri-question-line mt-0.5 shrink-0 text-[#36D399]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#F5F5F5]">
                Have some doubts about the project brief?
              </p>
              <p className="mt-0.5 text-xs text-[#9B9B9B]">
                Contact the client to further investigate
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="truncate text-xs text-[#36D399]">{clientEmail}</span>
                <button
                  type="button"
                  onClick={() => handleCopyEmail(clientEmail)}
                  aria-label="Copy client email"
                  title={copiedEmail ? 'Copied!' : 'Copy email'}
                  className="shrink-0 text-[rgba(255,255,255,0.4)] transition-colors hover:text-[rgba(255,255,255,0.8)]"
                >
                  <i
                    className={copiedEmail ? 'ri-check-line' : 'ri-clipboard-line'}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <Button
          variant={decision === 'reject' ? 'destructive' : 'primary'}
          onClick={handleSubmit}
          isLoading={isMutating}
          disabled={isSubmitDisabled}
          className="w-full"
        >
          Submit Review
        </Button>

        {/* Error display */}
        {(approveMutation.error || rejectMutation.error) && (
          <p className="text-sm text-red-400">
            {approveMutation.error?.message ?? rejectMutation.error?.message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Consultant team assignment action.
 */
function ConsultantAssignTeam({ projectId }: { projectId: string }) {
  const assignTeamMutation = useAssignTeam();

  const handleAssignTeam = useCallback(() => {
    assignTeamMutation.mutate({ contractAddress: projectId, teamSize: 2 });
  }, [assignTeamMutation, projectId]);

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-4">
      <h4 className="text-sm font-semibold text-[#F5F5F5]">
        Team Assignment
      </h4>
      <p className="text-sm text-[#9B9B9B]">
        The scope has been accepted. Assign the development team to start the project.
      </p>
      <Button
        variant="primary"
        onClick={handleAssignTeam}
        isLoading={assignTeamMutation.isPending}
        disabled={assignTeamMutation.isPending}
        className="w-full"
      >
        Assign Team
      </Button>
      {assignTeamMutation.error && (
        <p className="text-sm text-red-400">
          {assignTeamMutation.error.message}
        </p>
      )}
    </div>
  );
}

/**
 * Scoping actions section - shows scope builder trigger.
 */
function ScopingActions({
  onShowScopeBuilder,
  isScopeRejected,
}: {
  onShowScopeBuilder?: () => void;
  isScopeRejected: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-3">
      {isScopeRejected && (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
          <i className="ri-error-warning-line" />
          <span>
            The client rejected the previous scope. Please revise the milestones
            and submit again.
          </span>
        </div>
      )}
      <p className="text-sm text-[#9B9B9B]">
        {isScopeRejected
          ? 'Update the scope milestones and resubmit for client approval.'
          : 'Define the project scope by creating milestones.'}
      </p>
      {onShowScopeBuilder && (
        <Button variant="primary" onClick={onShowScopeBuilder} className="w-full">
          {isScopeRejected ? 'Revise Scope' : 'Build Scope'}
        </Button>
      )}
    </div>
  );
}

/**
 * Truncated, click-to-copy display for long emails or wallet addresses.
 *
 * Shows a shortened version (first 8 + last 6 chars) with a copy icon.
 * Clicking copies the full value to the clipboard and shows brief feedback.
 */
function CopyableEmail({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const MAX_DISPLAY = 20;
  const display =
    value.length > MAX_DISPLAY
      ? `${value.slice(0, 8)}...${value.slice(-6)}`
      : value;

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text so the user can Ctrl+C
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value}
      className="mt-1 inline-flex items-center gap-1.5 text-[#36D399] hover:text-[#4aeaaa] transition-colors cursor-pointer"
    >
      <span className="font-mono text-xs">{display}</span>
      <i
        className={`text-[10px] ${copied ? 'ri-check-line' : 'ri-file-copy-line'}`}
        aria-hidden="true"
      />
      {copied && (
        <span className="text-[10px] text-[#36D399]">Copied!</span>
      )}
    </button>
  );
}

/**
 * Information shown to clients when their proposal was rejected by the consultant.
 *
 * Includes:
 * - The rejection reason from the coordinator
 * - A feedback textarea where the client can respond to the rejection
 * - A "Send Feedback & Request Review" button to submit the response
 * - Contact info for the project leader (truncated + copyable)
 */
function ProposalRejectedInfo({
  project,
  onEditProposal,
  isEditingProposal,
}: {
  project: Project;
  onEditProposal?: () => void;
  isEditingProposal?: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const updateMutation = useUpdateProject();

  const reason =
    project.coordinatorRejectionReason ??
    project.proposalRejectionReason ??
    'No reason provided.';

  const handleSendFeedback = useCallback(() => {
    if (!feedback.trim()) return;

    updateMutation.mutate(
      {
        id: project.id,
        data: { clientResponse: feedback.trim() },
      },
      {
        onSuccess: () => {
          setFeedbackSent(true);
        },
      }
    );
  }, [feedback, project.id, updateMutation]);

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5 space-y-4">
      {/* Rejection header */}
      <div className="flex items-center gap-2">
        {project.consultantId && (
          <img
            className="h-6 w-6 rounded-full object-cover"
            src={`/developers/${project.consultantId}/attachment`}
            alt={project.consultant?.name ?? 'Consultant'}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/none.png';
            }}
          />
        )}
        <p className="text-sm font-medium text-red-400">
          {project.consultant?.name ?? 'The consultant'} rejected your project
        </p>
      </div>

      {/* Rejection reason */}
      <div className="rounded-[8px] border border-red-500/20 bg-[#141414] px-3 py-3">
        <p className="text-xs font-medium text-[rgba(255,255,255,0.5)] mb-1">Reason</p>
        <p className="text-sm text-[#C0C0C0] leading-relaxed">{reason}</p>
      </div>

      {/* Client feedback */}
      <div className="border-t border-[#3D3D3D] pt-4 space-y-3">
        <p className="text-xs font-medium text-[rgba(255,255,255,0.7)]">
          Your response
        </p>

        {feedbackSent ? (
          <div className="rounded-[8px] border border-[#36D399]/30 bg-[#36D399]/10 px-3 py-3">
            <div className="flex items-center gap-2 mb-1">
              <i className="ri-check-line text-[#36D399]" aria-hidden="true" />
              <p className="text-xs font-medium text-[#36D399]">Feedback sent</p>
            </div>
            <p className="text-sm text-[#C0C0C0] leading-relaxed">{feedback}</p>
          </div>
        ) : (
          <>
            <TextArea
              id="client-rejection-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain how you'd like to address the feedback or ask for clarification..."
              rows={3}
              className="text-sm"
            />
            <Button
              variant="primary"
              disabled={!feedback.trim() || updateMutation.isPending}
              onClick={handleSendFeedback}
              className="w-full gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                <>
                  <i className="ri-send-plane-line" aria-hidden="true" />
                  Send Feedback &amp; Request Review
                </>
              )}
            </Button>
            {updateMutation.isError && (
              <p className="text-xs text-red-400">
                Failed to send feedback. Please try again.
              </p>
            )}
          </>
        )}
      </div>

      {/* Edit proposal action */}
      {onEditProposal && (
        <div className="border-t border-[#3D3D3D] pt-4">
          <p className="mb-3 text-xs text-[#9B9B9B]">
            You can edit your proposal and request a new review.
          </p>
          <Button
            variant="outline"
            onClick={onEditProposal}
            className="w-full gap-2"
          >
            <i className={isEditingProposal ? 'ri-close-line' : 'ri-edit-line'} aria-hidden="true" />
            {isEditingProposal ? 'Cancel Editing' : 'Edit Proposal'}
          </Button>
        </div>
      )}

      {/* Contact section */}
      {project.consultant?.email && (
        <div className="flex items-start gap-2 border-t border-[#3D3D3D] pt-3">
          <i className="ri-question-line text-[#36D399] mt-0.5 shrink-0" aria-hidden="true" />
          <div className="text-xs text-[#9B9B9B]">
            <p>Not sure how to proceed?</p>
            <p className="mt-1">Contact the Project Leader</p>
            <CopyableEmail value={project.consultant.email} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client: Prompt to navigate to the full-page team evaluation
// ---------------------------------------------------------------------------

function ProjectCompletionPrompt({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#36D399] mb-1">
        <i className="ri-checkbox-circle-line" />
        <span>All milestones completed!</span>
      </div>

      <h4 className="text-sm font-semibold text-[#F5F5F5]">
        Finalize Project
      </h4>
      <p className="text-xs text-[#9B9B9B]">
        Rate the team members to complete the project and release payments.
      </p>

      <Button
        variant="primary"
        onClick={() => navigate(`/projects/${projectId}/evaluate`)}
        className="w-full gap-2"
      >
        <i className="ri-star-line" aria-hidden="true" />
        Evaluate Team
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consultant: Prompt to navigate to the full-page coordinator evaluation
// ---------------------------------------------------------------------------

function ConsultantEvaluationPrompt({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#36D399] mb-1">
        <i className="ri-checkbox-circle-line" />
        <span>Project completed!</span>
      </div>

      <h4 className="text-sm font-semibold text-[#F5F5F5]">
        Rate Project Participants
      </h4>
      <p className="text-xs text-[#9B9B9B]">
        As the coordinator, rate the client and team members to finalize your feedback.
      </p>

      <Button
        variant="primary"
        onClick={() => navigate(`/projects/${projectId}/evaluate/consultant`)}
        className="w-full gap-2"
      >
        <i className="ri-star-line" aria-hidden="true" />
        Rate Participants
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Developer: Prompt to navigate to the full-page developer evaluation
// ---------------------------------------------------------------------------

function DeveloperEvaluationPrompt({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#36D399] mb-1">
        <i className="ri-checkbox-circle-line" />
        <span>Project completed!</span>
      </div>

      <h4 className="text-sm font-semibold text-[#F5F5F5]">
        Rate the Coordinator
      </h4>
      <p className="text-xs text-[#9B9B9B]">
        Share your experience working with the project coordinator.
      </p>

      <Button
        variant="primary"
        onClick={() => navigate(`/projects/${projectId}/evaluate/developer`)}
        className="w-full gap-2"
      >
        <i className="ri-star-line" aria-hidden="true" />
        Rate Coordinator
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scope and proposal sub-components
// ---------------------------------------------------------------------------

/**
 * Client scope response section.
 *
 * Navigates to the dedicated ScopeReviewPage (/projects/:id/review-scope)
 * which handles the full flow: review milestones → accept/reject → escrow
 * modal → funding page. This mirrors the old EJS flow where scope acceptance
 * redirected to /projects/:id/escrow.
 */
function ClientScopeResponse({ project }: { project: Project }) {
  const navigate = useNavigate();

  const consultantComment =
    project.comments?.[0]?.consultantComment ?? 'Comments pending';

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-4">
      <h4 className="text-sm font-semibold text-[#F5F5F5]">
        Scope Review
      </h4>

      {/* Consultant's comment */}
      <div className="border-l-2 border-[#36D399] pl-3">
        <p className="text-xs text-[#9B9B9B] mb-1">Consultant's proposal:</p>
        <p className="text-sm text-[#C0C0C0]">{consultantComment}</p>
      </div>

      <p className="text-sm text-[#9B9B9B]">
        Review the proposed milestones, costs, and delivery timeline before accepting or rejecting the scope.
      </p>

      <Button
        variant="primary"
        onClick={() => navigate(`/projects/${project.id}/review-scope`)}
        className="w-full gap-2"
      >
        <i className="ri-file-search-line" aria-hidden="true" />
        Review Scope &amp; Milestones
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client: Payment auto-released info (smart contract handles escrow)
// ---------------------------------------------------------------------------

function ClientReleasePayment({ project: _project }: { project: Project }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <i className="ri-checkbox-circle-line" />
        <span>
          Payment was automatically released from escrow upon project completion.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Developer: Payment auto-released info (smart contract handles escrow)
// ---------------------------------------------------------------------------

function DeveloperClaimPayment({ project: _project }: { project: Project }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <i className="ri-money-dollar-circle-line" />
        <span>
          Payment has been released for this project.
        </span>
      </div>
    </div>
  );
}
