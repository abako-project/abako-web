/**
 * MilestoneActions - Renders workflow action buttons for a milestone
 *
 * Shows different actions based on milestone state and user role:
 *   - Developer/Consultant: "Submit Work" when MilestoneInProgress
 *   - Client: "Accept Delivery" / "Reject Delivery" when WaitingClientAcceptSubmission
 *
 * This component is designed to be embedded within MilestoneCard or
 * MilestoneList to provide inline workflow actions.
 */

import { useState, useCallback } from 'react';
import { Button, Input } from '@components/ui';
import {
  useSubmitMilestone,
  useAcceptMilestone,
  useRejectMilestone,
} from '@hooks/useMilestones';
import {
  flowMilestoneState,
  MilestoneState,
} from '@lib/flowStates';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import type { Milestone, User } from '@/types/index';

interface MilestoneActionsProps {
  /** The milestone to show actions for. */
  milestone: Milestone;
  /** The project ID this milestone belongs to. */
  projectId: string;
  /** The authenticated user. */
  user: User;
  /** Whether the user is a client for this project. */
  isClient: boolean;
  /** Whether the user is the consultant for this project. */
  isConsultant: boolean;
}

export function MilestoneActions({
  milestone,
  projectId,
  isClient,
  isConsultant,
}: MilestoneActionsProps) {
  const state = flowMilestoneState(milestone);
  const milestoneId = milestone.id;

  // If no milestone ID, it is a draft - no actions available
  if (!milestoneId) {
    return null;
  }

  return (
    <div className="mt-3 pl-6">
      {/* Consultant/Developer: Submit work for review (never shown to clients) */}
      {!isClient && isConsultant && state === MilestoneState.MilestoneInProgress && (
        <SubmitWorkAction projectId={projectId} milestoneId={milestoneId} milestone={milestone} />
      )}

      {/* Client: Accept or reject submitted work */}
      {isClient && state === MilestoneState.WaitingClientAcceptSubmission && (
        <AcceptRejectActions projectId={projectId} milestoneId={milestoneId} />
      )}

      {/* Client: Milestone completed notice */}
      {isClient && state === MilestoneState.MilestoneCompleted && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <i className="ri-checkbox-circle-line" />
          <span>Milestone completed. Awaiting payment release.</span>
        </div>
      )}

      {/* Consultant: Submission rejected - show resubmit form (never shown to clients) */}
      {!isClient && isConsultant && state === MilestoneState.SubmissionRejectedByClient && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <i className="ri-error-warning-line" />
            <span>Client rejected this submission. Please address the feedback and resubmit.</span>
          </div>
          <SubmitWorkAction projectId={projectId} milestoneId={milestoneId} milestone={milestone} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Submit work form for the consultant/developer.
 * Matches the Figma design with milestone summary, documentation, and links fields.
 */
function SubmitWorkAction({
  projectId,
  milestoneId,
  milestone,
}: {
  projectId: string;
  milestoneId: string;
  milestone: Milestone;
}) {
  const [showForm, setShowForm] = useState(false);
  const [documentation, setDocumentation] = useState(milestone.documentation ?? '');
  const [links, setLinks] = useState(milestone.links ?? '');
  const submitMutation = useSubmitMilestone();

  const handleSubmit = useCallback(() => {
    submitMutation.mutate({
      projectId,
      milestoneId,
      documentation: documentation.trim() || undefined,
      links: links.trim() || undefined,
    });
  }, [submitMutation, projectId, milestoneId, documentation, links]);

  if (!showForm) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => setShowForm(true)}
        className="text-xs"
      >
        <i className="ri-upload-2-line mr-1" />
        Submit for Review
      </Button>
    );
  }

  const budgetDisplay =
    milestone.budget !== undefined && milestone.budget !== null
      ? `${budgetPlanckToHuman(milestone.budget).toLocaleString('en-US')} DUSD`
      : 'Budget Pending';

  return (
    <div className="space-y-4 p-4 rounded-lg border border-[#3D3D3D] bg-[#231F1F]">
      {/* Milestone summary */}
      <div>
        <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3">
          Your Submission
        </h4>
        <div className="rounded-lg border border-[#3D3D3D] bg-[#1A1A1A] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#F5F5F5]">
              {milestone.title}
            </span>
            <span className="text-xs font-medium text-[#36D399]">
              {budgetDisplay}
            </span>
          </div>
          {milestone.description && (
            <p className="text-xs text-[#9B9B9B] leading-relaxed">
              {milestone.description}
            </p>
          )}
          {milestone.developer && (
            <div className="flex items-center gap-2 text-xs text-[#9B9B9B]">
              <img
                className="h-5 w-5 rounded-full object-cover"
                src={`/developers/${milestone.developerId}/attachment`}
                alt={milestone.developer.name ?? 'Developer'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/none.png';
                }}
              />
              <span>{milestone.developer.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Documentation field */}
      <div>
        <label className="block text-xs font-medium text-[#9B9B9B] mb-1.5">
          Documentation
        </label>
        <Input
          value={documentation}
          onChange={(e) => setDocumentation(e.target.value)}
          placeholder="Provide a link to your documentation"
        />
      </div>

      {/* Other Links field */}
      <div>
        <label className="block text-xs font-medium text-[#9B9B9B] mb-1.5">
          Other Links
        </label>
        <Input
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder="Add links to supporting documents"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitMutation.isPending}
          disabled={submitMutation.isPending}
          className="flex-1"
        >
          Submit Milestone
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowForm(false)}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>

      {submitMutation.error && (
        <p className="text-xs text-red-400">{submitMutation.error.message}</p>
      )}
    </div>
  );
}

/**
 * Accept/Reject actions for the client.
 */
function AcceptRejectActions({
  projectId,
  milestoneId,
}: {
  projectId: string;
  milestoneId: string;
}) {
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  const acceptMutation = useAcceptMilestone();
  const rejectMutation = useRejectMilestone();

  const handleAccept = useCallback(() => {
    acceptMutation.mutate({ projectId, milestoneId, comment });
  }, [acceptMutation, projectId, milestoneId, comment]);

  const handleReject = useCallback(() => {
    rejectMutation.mutate({ projectId, milestoneId, comment });
  }, [rejectMutation, projectId, milestoneId, comment]);

  if (action === null) {
    return (
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAction('accept')}
          className="text-xs"
        >
          <i className="ri-check-line mr-1" />
          Accept Delivery
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setAction('reject')}
          className="text-xs"
        >
          <i className="ri-close-line mr-1" />
          Reject Delivery
        </Button>
      </div>
    );
  }

  const isAccepting = action === 'accept';
  const mutation = isAccepting ? acceptMutation : rejectMutation;

  return (
    <div className="space-y-2 p-3 rounded-lg border border-[#3D3D3D] bg-[#231F1F]">
      <p className="text-xs text-[#9B9B9B]">
        {isAccepting
          ? 'Are you sure you want to accept this delivery? The milestone will be marked as completed.'
          : 'Are you sure you want to reject this delivery? The developer will need to address the feedback.'}
      </p>
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={
          isAccepting
            ? 'Optional: Add a comment'
            : 'Provide feedback for the developer'
        }
      />
      <div className="flex gap-2">
        <Button
          variant={isAccepting ? 'primary' : 'destructive'}
          size="sm"
          onClick={isAccepting ? handleAccept : handleReject}
          isLoading={mutation.isPending}
          disabled={mutation.isPending}
          className="text-xs"
        >
          {isAccepting ? 'Confirm Accept' : 'Confirm Reject'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAction(null);
            setComment('');
          }}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
      {mutation.error && (
        <p className="text-xs text-red-400">{mutation.error.message}</p>
      )}
    </div>
  );
}
