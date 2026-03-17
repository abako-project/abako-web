/**
 * TeamEvaluationPage - Full-page team evaluation for project completion
 *
 * Accessible at /projects/:id/evaluate
 *
 * Shown to clients when all milestones are completed. Provides a full-page
 * experience with large centered cards, 56px avatars, and star ratings for
 * each team member. On submit, calls useSubmitVotes to complete the project.
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@hooks/useProjects';
import { useVoteMembers, useSubmitVotes } from '@hooks/useVotes';
import { Button, Spinner, ConfirmDialog } from '@components/ui';
import type { VoteMember } from '@/types/index';

export default function TeamEvaluationPage(): JSX.Element {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projectData, isLoading: loadingProject } = useProject(projectId);
  const { data: voteData, isLoading: loadingMembers } = useVoteMembers(projectId);
  const submitVotes = useSubmitVotes();

  const [coordinatorRating, setCoordinatorRating] = useState(0);
  const [memberRatings, setMemberRatings] = useState<Record<string, number>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const project = projectData?.project;

  const handleMemberRating = useCallback((userId: string, score: number) => {
    setMemberRatings((prev) => ({ ...prev, [userId]: score }));
  }, []);

  // Declared before the callbacks that reference it so TypeScript is happy.
  const allRated =
    coordinatorRating > 0 &&
    (voteData?.members ?? []).every(
      (m) => !m.userId || (memberRatings[m.userId] ?? 0) > 0
    );

  // Opens the confirmation dialog — actual mutation fires only after the user confirms.
  const handleRequestSubmit = useCallback(() => {
    if (!projectId || !allRated) return;
    setIsConfirmOpen(true);
  }, [projectId, allRated]);

  // Fires the mutation after the user confirms the release dialog.
  const handleConfirmedSubmit = useCallback(() => {
    if (!projectId) return;

    const votes = (voteData?.members ?? [])
      .filter((m): m is VoteMember & { userId: string } => !!m.userId)
      .map((m) => ({
        userId: m.userId,
        score: memberRatings[m.userId] ?? 0,
      }));
    submitVotes.mutate(
      { projectId, votes, coordinatorRating },
      {
        onSuccess: () => {
          setIsConfirmOpen(false);
          navigate(`/projects/${projectId}`);
        },
        onError: () => {
          // Keep dialog open on error so the user can retry or cancel.
          setIsConfirmOpen(false);
        },
      }
    );
  }, [submitVotes, projectId, voteData, memberRatings, coordinatorRating, navigate]);

  const isLoading = loadingProject || loadingMembers;

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--base-surface-1,#141414)] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ---- Error ----
  if (!project) {
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
          <h2 className="text-xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            Project not found
          </h2>
        </div>
      </div>
    );
  }

  const members = voteData?.members ?? [];

  return (
    <div className="min-h-screen bg-[var(--base-surface-1,#141414)]">
      <div className="px-8 lg:px-[112px] py-10 max-w-2xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="flex items-center gap-1 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] mb-6"
        >
          <i className="ri-arrow-left-s-line text-lg" />
          Back to Project
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(54,211,153,0.15)] flex items-center justify-center">
            <i className="ri-star-line text-3xl text-[var(--state-brand-active,#36d399)]" />
          </div>
          <h1 className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)] mb-2">
            Evaluate Your Team
          </h1>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            All milestones for{' '}
            <span className="text-[var(--state-brand-active,#36d399)] font-medium">
              {project.title}
            </span>{' '}
            have been completed. Rate the team to finalize the project.
          </p>
        </div>

        {/* Coordinator rating card */}
        {project.consultant && (
          <EvaluationCard
            name={project.consultant.name}
            role="Project Coordinator"
            avatarUrl={
              project.consultant.githubUsername
                ? `https://github.com/${project.consultant.githubUsername}.png?size=56`
                : undefined
            }
            rating={coordinatorRating}
            onRatingChange={setCoordinatorRating}
          />
        )}

        {/* Team member rating cards */}
        {members.map((member) =>
          member.userId ? (
            <EvaluationCard
              key={member.userId}
              name={member.name}
              role={member.role ?? 'Developer'}
              avatarUrl={member.imageUrl !== '/images/none.png' ? member.imageUrl : undefined}
              rating={memberRatings[member.userId] ?? 0}
              onRatingChange={(score) => handleMemberRating(member.userId!, score)}
            />
          ) : null
        )}

        {/* Submit — opens confirmation dialog before firing the mutation */}
        <Button
          variant="primary"
          onClick={handleRequestSubmit}
          disabled={submitVotes.isPending || !allRated}
          className="w-full mt-6"
        >
          Complete Project
        </Button>

        {!allRated && (
          <p className="mt-3 text-center text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            Please rate all team members before completing the project.
          </p>
        )}

        {submitVotes.error && (
          <p className="mt-3 text-center text-sm text-red-400">
            {submitVotes.error.message}
          </p>
        )}
      </div>

      {/* Payment release confirmation dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Release Payment"
        description="Are you sure you want to release this payment? This action cannot be undone. Funds will be transferred to the developer."
        confirmLabel="Release Payment"
        confirmVariant="danger"
        isLoading={submitVotes.isPending}
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evaluation Card
// ---------------------------------------------------------------------------

interface EvaluationCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  rating: number;
  onRatingChange: (value: number) => void;
}

function EvaluationCard({
  name,
  role,
  avatarUrl,
  rating,
  onRatingChange,
}: EvaluationCardProps): JSX.Element {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-6 mb-4">
      <div className="flex items-center gap-4 mb-4">
        {/* 56px avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--base-border,#3d3d3d)] bg-[var(--base-fill-2,#3d3d3d)] flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/none.png';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="ri-user-line text-2xl text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]" />
            </div>
          )}
        </div>
        <div>
          <p className="text-base font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            {name}
          </p>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            {role}
          </p>
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= (hovered || rating);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onRatingChange(starValue)}
              onMouseEnter={() => setHovered(starValue)}
              onMouseLeave={() => setHovered(0)}
              className="p-1 focus:outline-none transition-transform hover:scale-110"
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  filled
                    ? 'text-[var(--state-brand-active,#36d399)]'
                    : 'text-[rgba(255,255,255,0.15)]'
                }`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1.333l1.885 4.347 4.782.427-3.614 3.08 1.117 4.646L8 11.347l-4.17 2.486 1.117-4.646-3.614-3.08 4.782-.427L8 1.333z" />
              </svg>
            </button>
          );
        })}
        <span className="ml-3 text-sm font-medium text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          {rating}/5
        </span>
      </div>
    </div>
  );
}
