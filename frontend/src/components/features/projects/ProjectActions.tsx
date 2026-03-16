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
import { Button, Input } from '@components/ui';
import { useApproveProposal, useRejectProposal, useAssignTeam } from '@hooks/useProjects';
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
}

export function ProjectActions({
  project,
  user,
  scope,
  onShowScopeBuilder,
  onApproveProposal,
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
      {isConsultant &&
        state === ProjectState.WaitingForProposalApproval && (
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
        <ProposalRejectedInfo project={project} />
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
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();

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

  return (
    <div className="rounded-lg border border-[#3D3D3D] bg-[#231F1F] p-5 space-y-4">
      <h4 className="text-sm font-semibold text-[#F5F5F5]">
        Proposal Review
      </h4>

      <Button
        variant="primary"
        onClick={handleApprove}
        isLoading={approveMutation.isPending}
        disabled={approveMutation.isPending || rejectMutation.isPending}
        className="w-full"
      >
        Approve Proposal
      </Button>

      {!showRejectForm ? (
        <Button
          variant="outline"
          onClick={() => setShowRejectForm(true)}
          className="w-full"
        >
          Reject Proposal
        </Button>
      ) : (
        <div className="space-y-3 border-t border-[#3D3D3D] pt-4">
          <p className="text-sm text-[#9B9B9B]">
            Provide an explanation for the rejection:
          </p>
          <Input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Type your reason here (required)"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              isLoading={rejectMutation.isPending}
              disabled={
                !rejectionReason.trim() ||
                approveMutation.isPending ||
                rejectMutation.isPending
              }
              className="flex-1"
            >
              Reject Proposal
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowRejectForm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Help section */}
      {project.client?.email && (
        <div className="flex items-start gap-2 border-t border-[#3D3D3D] pt-4">
          <i className="ri-question-line text-[#36D399] mt-0.5" />
          <div className="text-xs text-[#9B9B9B]">
            <p>Have some doubts about the project brief?</p>
            <p className="mt-1">Contact the client to further investigate</p>
            <p className="mt-1 text-[#36D399]">{project.client.email}</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {(approveMutation.error || rejectMutation.error) && (
        <p className="text-sm text-red-400">
          {approveMutation.error?.message ?? rejectMutation.error?.message}
        </p>
      )}
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
 * Information shown to clients when their proposal was rejected.
 */
function ProposalRejectedInfo({ project }: { project: Project }) {
  const reason =
    project.coordinatorRejectionReason ??
    project.proposalRejectionReason ??
    'No reason provided.';

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5 space-y-3">
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
        <p className="text-sm text-red-400">
          {project.consultant?.name ?? 'The consultant'} rejected your project
        </p>
      </div>
      <p className="text-sm text-[#9B9B9B]">{reason}</p>

      {project.consultant?.email && (
        <div className="flex items-start gap-2 border-t border-[#3D3D3D] pt-3">
          <i className="ri-question-line text-[#36D399] mt-0.5" />
          <div className="text-xs text-[#9B9B9B]">
            <p>Not sure how to proceed?</p>
            <p className="mt-1">Contact the Project Leader</p>
            <p className="mt-1 text-[#36D399]">{project.consultant.email}</p>
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
