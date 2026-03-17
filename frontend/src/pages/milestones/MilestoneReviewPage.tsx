/**
 * MilestoneReviewPage - Full-page client milestone review
 *
 * Accessible at /projects/:projectId/milestones/:milestoneId/review
 *
 * Allows a client to review a submitted milestone and either accept or reject
 * the delivery. Shows milestone details, an accept/reject toggle, a comment
 * textarea, and a help card with consultant contact info.
 *
 * Access guards:
 *   - Role guard: only the project client can access this page.
 *   - State guard: the milestone must be in `in_review` state.
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProject } from '@hooks/useProjects';
import { useAcceptMilestone, useRejectMilestone } from '@hooks/useMilestones';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import { isProjectClient } from '@lib/permissions';
import { flowMilestoneState, MilestoneState } from '@lib/flowStates';
import { useAuthStore } from '@/stores/authStore';
import { Button, Spinner } from '@components/ui';
import { Avatar } from '@components/ui/Avatar';
import { MilestoneStatusBadge } from '@components/features/projects/MilestoneStatusBadge';

type ReviewDecision = 'accept' | 'reject' | null;

export default function MilestoneReviewPage(): JSX.Element {
  const { projectId, milestoneId } = useParams<{
    projectId: string;
    milestoneId: string;
  }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useProject(projectId);

  const [decision, setDecision] = useState<ReviewDecision>(null);
  const [comment, setComment] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);

  const acceptMutation = useAcceptMilestone();
  const rejectMutation = useRejectMilestone();

  const project = data?.project;
  const milestone = project?.milestones.find((m) => m.id === milestoneId);

  const handleSubmit = useCallback(() => {
    if (!projectId || !milestoneId || !decision) return;

    const mutation = decision === 'accept' ? acceptMutation : rejectMutation;
    mutation.mutate(
      { projectId, milestoneId, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          navigate(`/projects/${projectId}`);
        },
      }
    );
  }, [
    projectId,
    milestoneId,
    decision,
    comment,
    acceptMutation,
    rejectMutation,
    navigate,
  ]);

  const handleCopyEmail = useCallback(() => {
    if (!project?.consultant?.email) return;
    void navigator.clipboard.writeText(project.consultant.email).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }).catch(() => {
      // silent fail — clipboard not available
    });
  }, [project?.consultant?.email]);

  const isPending = acceptMutation.isPending || rejectMutation.isPending;
  const mutationError = acceptMutation.error ?? rejectMutation.error;

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--base-surface-1,#141414)] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ---- Error / Not found ----
  if (isError || !project || !milestone) {
    return (
      <div className="min-h-screen bg-[var(--base-surface-1,#141414)] px-8 lg:px-[112px] py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] mb-6"
        >
          <i className="ri-arrow-left-s-line text-lg" />
          Back
        </button>
        <div className="text-center py-16">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-2">
            Milestone not found
          </h2>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            The milestone you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // ---- Role guard: only the project client may review ----
  if (!isProjectClient(user, project.clientId)) {
    return (
      <div className="min-h-screen bg-[var(--base-surface-1,#141414)] px-8 lg:px-[112px] py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] mb-6"
        >
          <i className="ri-arrow-left-s-line text-lg" />
          Back
        </button>
        <div className="text-center py-16">
          <i className="ri-lock-line text-4xl text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-2">
            Access denied
          </h2>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-6">
            You don't have permission to review this milestone.
          </p>
          <Link
            to={`/projects/${projectId}`}
            className="text-sm text-[var(--state-brand-active,#36d399)] hover:underline"
          >
            Back to project
          </Link>
        </div>
      </div>
    );
  }

  // ---- State guard: milestone must be in_review ----
  const milestoneFlowState = flowMilestoneState(milestone);
  if (milestoneFlowState !== MilestoneState.WaitingClientAcceptSubmission) {
    return (
      <div className="min-h-screen bg-[var(--base-surface-1,#141414)] px-8 lg:px-[112px] py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] mb-6"
        >
          <i className="ri-arrow-left-s-line text-lg" />
          Back
        </button>
        <div className="text-center py-16">
          <i className="ri-information-line text-4xl text-yellow-400 mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-2">
            Milestone not available for review
          </h2>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-4">
            This milestone is not currently available for review.
          </p>
          <div className="flex justify-center mb-6">
            <MilestoneStatusBadge milestone={milestone} />
          </div>
          <Link
            to={`/projects/${projectId}`}
            className="text-sm text-[var(--state-brand-active,#36d399)] hover:underline"
          >
            Back to project
          </Link>
        </div>
      </div>
    );
  }

  const budgetDisplay =
    milestone.budget !== undefined && milestone.budget !== null
      ? `${budgetPlanckToHuman(milestone.budget).toLocaleString('en-US')} DUSD`
      : 'Budget Pending';

  const developerName =
    milestone.developer?.name ?? project.consultant?.name ?? 'Unassigned';
  const githubUsername =
    milestone.developer?.githubUsername ?? project.consultant?.githubUsername;
  const developerAvatar = githubUsername
    ? `https://github.com/${githubUsername}.png?size=56`
    : undefined;

  return (
    <div className="min-h-screen bg-[var(--base-surface-1,#141414)]">
      <div className="px-8 lg:px-[112px] py-10">
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] mb-6"
        >
          <i className="ri-arrow-left-s-line text-lg" />
          Back to Dashboard
        </button>

        {/* Page title */}
        <h1 className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)] mb-2">
          Review Milestone
        </h1>
        <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-8">
          Review the submitted work for{' '}
          <span className="text-[var(--state-brand-active,#36d399)]">
            {project.title}
          </span>
        </p>

        {/* Two-column layout when reject panel is active */}
        <div className={`flex gap-6 items-start ${decision === 'reject' ? 'flex-col lg:flex-row' : 'flex-col max-w-3xl'}`}>

          {/* Left column: milestone details + decision card */}
          <div className={decision === 'reject' ? 'flex-1 min-w-0' : 'w-full'}>
            {/* Milestone details card */}
            <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-6 mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-1">
                    {milestone.title}
                  </h2>
                  {milestone.description && (
                    <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] leading-relaxed">
                      {milestone.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center h-7 px-3 rounded-[var(--radi-6,12px)] text-sm font-semibold text-[var(--state-brand-active,#36d399)] bg-[rgba(54,211,153,0.12)] border border-[rgba(54,211,153,0.2)]">
                  {budgetDisplay}
                </span>
              </div>

              {/* Developer info */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--base-border,#3d3d3d)]">
                <Avatar
                  src={developerAvatar}
                  alt={developerName}
                  size="md"
                  className="w-10 h-10 border border-[var(--base-border,#3d3d3d)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text-dark-primary,#f5f5f5)]">
                    {developerName}
                  </p>
                  <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
                    Developer
                  </p>
                </div>
              </div>

              {/* Documentation & links */}
              {(milestone.documentation || milestone.links) && (
                <div className="mt-4 pt-4 border-t border-[var(--base-border,#3d3d3d)] space-y-2">
                  {milestone.documentation && (
                    <div className="flex items-center gap-2 text-sm">
                      <i className="ri-file-text-line text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]" />
                      <a
                        href={milestone.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--state-brand-active,#36d399)] hover:underline truncate"
                      >
                        {milestone.documentation}
                      </a>
                    </div>
                  )}
                  {milestone.links && (
                    <div className="flex items-center gap-2 text-sm">
                      <i className="ri-link text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]" />
                      <a
                        href={milestone.links}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--state-brand-active,#36d399)] hover:underline truncate"
                      >
                        {milestone.links}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Decision toggle */}
            <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-6 mb-6">
              <h3 className="text-sm font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-4">
                Your Decision
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setDecision('accept')}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-2 h-12 rounded-[var(--radi-6,12px)] border text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    decision === 'accept'
                      ? 'bg-[var(--state-brand-active,#36d399)] border-[var(--state-brand-active,#36d399)] text-[var(--text-light-primary,#141414)]'
                      : 'bg-transparent border-[var(--base-border,#3d3d3d)] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:border-[var(--state-brand-active,#36d399)] hover:text-[var(--text-dark-primary,#f5f5f5)]'
                  }`}
                >
                  <i className="ri-check-line text-lg" />
                  Accept Delivery
                </button>
                <button
                  onClick={() => setDecision('reject')}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-2 h-12 rounded-[var(--radi-6,12px)] border text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    decision === 'reject'
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-transparent border-[var(--base-border,#3d3d3d)] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:border-red-400 hover:text-[var(--text-dark-primary,#f5f5f5)]'
                  }`}
                >
                  <i className="ri-close-line text-lg" />
                  Reject Delivery
                </button>
              </div>

              {/* Comment textarea — only shown when not rejecting (reject has its own panel) */}
              {decision !== 'reject' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-2">
                    Comment (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment about this delivery..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-1,#141414)] text-sm text-[var(--text-dark-primary,#f5f5f5)] placeholder:text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] focus:outline-none focus:ring-1 focus:ring-[var(--state-brand-active,#36d399)] resize-none"
                  />
                </div>
              )}

              {/* Submit */}
              <Button
                variant={decision === 'reject' ? 'destructive' : 'primary'}
                onClick={handleSubmit}
                isLoading={isPending}
                disabled={isPending || !decision}
                className="w-full mt-4"
              >
                {decision === 'accept'
                  ? 'Confirm Accept'
                  : decision === 'reject'
                    ? 'Confirm Reject'
                    : 'Select a decision above'}
              </Button>

              {mutationError && (
                <p className="mt-3 text-sm text-red-400">{mutationError.message}</p>
              )}
            </div>

            {/* Help card — shown below decision card when not in reject mode */}
            {decision !== 'reject' && project.consultant?.email && (
              <HelpCard
                email={project.consultant.email}
                copied={emailCopied}
                onCopy={handleCopyEmail}
              />
            )}
          </div>

          {/* Right column: rejection warning panel (only shown when reject is selected) */}
          {decision === 'reject' && (
            <div className="w-full lg:w-[420px] shrink-0 space-y-4">
              {/* Warning box */}
              <div
                className="rounded-[var(--radi-6,12px)] border p-5"
                style={{
                  backgroundColor: 'var(--colors-red-50, #461a1a)',
                  borderColor: 'var(--colors-red-100, #6b1919)',
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <i className="ri-error-warning-line text-xl mt-0.5 shrink-0" style={{ color: 'var(--state-danger-active, #ff7575)' }} />
                  <h3
                    className="text-sm font-semibold leading-tight"
                    style={{ color: 'var(--state-danger-active, #ff7575)' }}
                  >
                    You're about to reject a milestone submission
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-4">
                  Rejecting this milestone submission initiates a formal dispute.
                </p>
                <ol className="space-y-3">
                  {[
                    'You, as the client, will state your reasons, which are added to the dispute record.',
                    'The Project Coordinator can then add their arguments and change their submission.',
                    "Until you don't accept the milestone, the payment will be held.",
                  ].map((text, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span
                        className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5"
                        style={{
                          backgroundColor: 'var(--colors-red-100, #6b1919)',
                          color: 'var(--state-danger-active, #ff7575)',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] leading-relaxed">
                        {text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Rejection reason textarea */}
              <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-5">
                <label className="block text-xs font-medium text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-2">
                  State your reasons for rejection
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment (optional)"
                  rows={5}
                  className="w-full px-4 py-3 rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-1,#141414)] text-sm text-[var(--text-dark-primary,#f5f5f5)] placeholder:text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] focus:outline-none focus:ring-1 focus:ring-[var(--state-danger-active,#ff7575)] resize-none"
                />
              </div>

              {/* Help card within reject panel */}
              {project.consultant?.email && (
                <HelpCard
                  email={project.consultant.email}
                  copied={emailCopied}
                  onCopy={handleCopyEmail}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HelpCard sub-component
// ---------------------------------------------------------------------------

interface HelpCardProps {
  email: string;
  copied: boolean;
  onCopy: () => void;
}

function HelpCard({ email, copied, onCopy }: HelpCardProps): JSX.Element {
  return (
    <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-5">
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--colors-emerald-200, #036347)' }}
        >
          <i className="ri-question-line text-sm text-[var(--text-dark-primary,#f5f5f5)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-dark-primary,#f5f5f5)] mb-1">
            Not sure if to accept or reject?
          </p>
          <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-3">
            Contact the Project Leader to further investigate
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--state-brand-active,#36d399)] truncate">
              {email}
            </span>
            <button
              onClick={onCopy}
              title="Copy email"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-[var(--radi-4,8px)] border border-[var(--base-border,#3d3d3d)] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] hover:border-[var(--state-brand-active,#36d399)] transition-colors"
            >
              <i className={`text-xs ${copied ? 'ri-check-line text-[var(--state-brand-active,#36d399)]' : 'ri-clipboard-line'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
