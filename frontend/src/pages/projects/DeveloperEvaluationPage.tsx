/**
 * DeveloperEvaluationPage - Full-page evaluation for a developer rating the coordinator
 *
 * Accessible at /projects/:id/evaluate/developer
 *
 * Shown to developers when the project is completed. Provides a full-page
 * experience with large centered cards, 56px avatars, and a star rating for
 * the project coordinator. On submit, calls useSubmitDeveloperRating.
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@hooks/useProjects';
import { useSubmitDeveloperRating } from '@hooks/useVotes';
import { Button, Spinner } from '@components/ui';
import { adapterConfig } from '@/api/config';

export default function DeveloperEvaluationPage(): JSX.Element {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projectData, isLoading } = useProject(projectId);
  const submitRating = useSubmitDeveloperRating();

  const [coordinatorRating, setCoordinatorRating] = useState(0);

  const project = projectData?.project;

  const handleSubmit = useCallback(() => {
    if (!projectId) return;

    submitRating.mutate(
      { projectId, coordinatorRating },
      {
        onSuccess: () => {
          navigate(`/projects/${projectId}`);
        },
      }
    );
  }, [submitRating, projectId, coordinatorRating, navigate]);

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

  const coordinatorAvatarUrl = project.consultantId
    ? `${adapterConfig.baseURL}/developers/${project.consultantId}/attachment`
    : undefined;

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
            Rate Your Coordinator
          </h1>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            The project{' '}
            <span className="text-[var(--state-brand-active,#36d399)] font-medium">
              {project.title}
            </span>{' '}
            has been completed. Share your experience working with the coordinator.
          </p>
        </div>

        {/* Coordinator rating card */}
        {project.consultant && (
          <EvaluationCard
            name={project.consultant.name}
            role="Project Coordinator"
            avatarUrl={coordinatorAvatarUrl}
            rating={coordinatorRating}
            onRatingChange={setCoordinatorRating}
          />
        )}

        {/* Submit */}
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitRating.isPending}
          disabled={submitRating.isPending || coordinatorRating === 0}
          className="w-full mt-6"
        >
          Submit Rating
        </Button>

        {coordinatorRating === 0 && (
          <p className="mt-3 text-center text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            Please rate the coordinator before submitting.
          </p>
        )}

        {submitRating.error && (
          <p className="mt-3 text-center text-sm text-red-400">
            {submitRating.error.message}
          </p>
        )}
      </div>
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
