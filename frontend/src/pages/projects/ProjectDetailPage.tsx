/**
 * ProjectDetailPage - Single project detail view
 *
 * Displays the complete project information with tabbed navigation matching
 * the Figma design (112:8790).
 *
 * Features:
 * - Project header with title, summary, state badge
 * - TabsLine component for switching views (Milestones, Details)
 * - Client and consultant info
 * - Project scope: description, delivery time, budget, project type
 * - Milestones list with individual states
 * - Action panel based on project state and user role
 * - Scope builder for consultants when in scoping state
 */

import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@hooks/useProjects';
import { useAuthStore } from '@stores/authStore';
import { flowProjectState, ProjectState } from '@lib/flowStates';
import { Spinner } from '@components/ui';
import { ProjectStateBadge } from '@components/shared/ProjectStateBadge';
import { ProjectActions } from '@components/features/projects/ProjectActions';
import { ScopeBuilder } from '@components/features/projects/ScopeBuilder';
import { MilestoneList } from '@components/features/milestones/MilestoneList';
import type { Project, ScopeSession } from '@/types/index';

type TabValue = 'milestones' | 'details';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error, refetch } = useProject(id);

  const [showScopeBuilder, setShowScopeBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('details');
  const [scope, setScope] = useState<ScopeSession | undefined>(undefined);

  const handleScopeBuilderShow = useCallback(() => {
    setShowScopeBuilder(true);
  }, []);

  const handleScopeSubmitted = useCallback(() => {
    setShowScopeBuilder(false);
    setScope(undefined);
    void refetch();
  }, [refetch]);

  const handleApproveProposal = useCallback(
    (projectId: string) => {
      setScope({ projectId, milestones: [] });
    },
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="px-8 lg:px-[var(--spacing-22,112px)] py-10">
        <div className="max-w-2xl mx-auto p-8 rounded-[var(--radi-6,12px)] bg-[var(--base-surface-2,#231f1f)] border border-red-500/30 text-center">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3 block" />
          <h2 className="text-xl font-bold text-[var(--text-dark-primary,#f5f5f5)] mb-2">
            Failed to load project
          </h2>
          <p className="text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-4">
            {error?.message ?? 'Project not found or you do not have access.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => void refetch()}
              className="px-4 py-2 rounded-[var(--radi-6,12px)] bg-[var(--state-brand-active,#36d399)] text-[var(--text-light-primary,#141414)] font-medium hover:shadow-lg transition-shadow"
            >
              Retry
            </button>
            <Link
              to="/projects"
              className="px-4 py-2 rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:border-[#555] transition-colors"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { project, allBudgets, allDeliveryTimes, allProjectTypes } = data;
  const projectState = flowProjectState(project, scope);

  // Determine if the scope builder should be accessible
  const isConsultant =
    !!user?.developerId && String(user.developerId) === String(project.consultantId);
  const canShowScopeBuilder =
    isConsultant &&
    (projectState === ProjectState.ScopingInProgress ||
      projectState === ProjectState.ScopeRejected);

  return (
    <div className="min-h-screen bg-[var(--base-surface-1,#141414)] px-8 lg:px-[var(--spacing-17,56px)] py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
        <Link to="/projects" className="hover:text-[var(--text-dark-primary,#f5f5f5)] transition-colors">
          Projects
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text-dark-primary,#f5f5f5)]">{project.title}</span>
      </nav>

      {/* Project Header */}
      <ProjectHeader
        project={project}
        allBudgets={allBudgets}
        allDeliveryTimes={allDeliveryTimes}
        allProjectTypes={allProjectTypes}
      />

      {/* TabsLine for navigation */}
      <div className="mt-6 mb-8">
        <TabsLine activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Project info + Milestones */}
        <div className="lg:col-span-2 space-y-8">
          {/* Details Tab Content */}
          {activeTab === 'details' && (
            <>
              {/* Project Scope / Description */}
              <ProjectScopeInfo
                project={project}
                allBudgets={allBudgets}
                allDeliveryTimes={allDeliveryTimes}
                allProjectTypes={allProjectTypes}
              />

              {/* Scope Builder (shown inline when active) */}
              {canShowScopeBuilder && showScopeBuilder && (
                <ScopeBuilder
                  projectId={project.id}
                  existingMilestones={
                    project.milestones.length > 0
                      ? project.milestones
                      : undefined
                  }
                  onSubmitted={handleScopeSubmitted}
                  onCancel={() => setShowScopeBuilder(false)}
                />
              )}
            </>
          )}

          {/* Milestones Tab Content */}
          {activeTab === 'milestones' && (
            <MilestoneList
              milestones={project.milestones}
              allDeliveryTimes={allDeliveryTimes}
              projectId={project.id}
              user={user ?? undefined}
              isClient={!!user?.clientId && String(user.clientId) === String(project.clientId)}
              isConsultant={isConsultant}
            />
          )}

        </div>

        {/* Right column: Actions */}
        <div className="space-y-6">
          {user && (
            <ProjectActions
              project={project}
              user={user}
              scope={scope}
              onShowScopeBuilder={
                canShowScopeBuilder ? handleScopeBuilderShow : undefined
              }
              onApproveProposal={handleApproveProposal}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * TabsLine - Tabbed navigation component matching Figma design.
 */
interface TabsLineProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

function TabsLine({ activeTab, onTabChange }: TabsLineProps) {
  const tabs: Array<{ value: TabValue; label: string }> = [
    { value: 'details', label: 'Details' },
    { value: 'milestones', label: 'Milestones' },
  ];

  return (
    <div className="border-b border-[var(--base-border,#3d3d3d)]">
      <div className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`relative pb-3 px-1 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'text-[var(--state-brand-active,#36d399)]'
                : 'text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)]'
            }`}
            style={{ fontFamily: 'Inter' }}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--state-brand-active,#36d399)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * ProjectHeader - Title, summary, client info, state badge.
 * Mirrors projects/headers/_project.ejs.
 */
function ProjectHeader({
  project,
  allBudgets: _allBudgets,
  allDeliveryTimes: _allDeliveryTimes,
  allProjectTypes: _allProjectTypes,
}: {
  project: Project;
  allBudgets: Array<{ id: number; description: string }>;
  allDeliveryTimes: Array<{ id: number; description: string }>;
  allProjectTypes: Array<{ id: number; description: string }>;
}) {
  return (
    <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] pt-[var(--spacing-12,32px)] pb-[var(--spacing-14,40px)] px-[var(--spacing-17,56px)]">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left: Title + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>
              {project.title}
            </h1>
            <ProjectStateBadge project={project} />
          </div>
          {project.summary && (
            <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] max-w-2xl" style={{ fontFamily: 'Inter' }}>
              {project.summary}
            </p>
          )}
        </div>

        {/* Right: Client info */}
        {project.client && (
          <div className="flex items-center gap-3 shrink-0">
            <img
              className="h-10 w-10 rounded-full object-cover border border-[var(--base-border,#3d3d3d)]"
              src={`/clients/${project.clientId}/attachment`}
              alt={project.client.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/none.png';
              }}
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>
                {project.client.name}
              </p>
              {project.client.website && (
                <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] flex items-center gap-1" style={{ fontFamily: 'Inter' }}>
                  <i className="ri-global-fill" />
                  {project.client.website}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Consultant info (if assigned) */}
      {project.consultant && (
        <div className="mt-4 pt-4 border-t border-[var(--base-border,#3d3d3d)] flex items-center gap-3">
          <img
            className="h-8 w-8 rounded-full object-cover border border-[var(--base-border,#3d3d3d)]"
            src={`/developers/${project.consultantId}/attachment`}
            alt={project.consultant.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/none.png';
            }}
          />
          <div>
            <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]" style={{ fontFamily: 'Inter' }}>Project Consultant</p>
            <p className="text-sm font-medium text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>
              {project.consultant.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ProjectScopeInfo - Project description, delivery time, budget, project type.
 * Mirrors proposals/info/_bodyProposals.ejs.
 */
function ProjectScopeInfo({
  project,
  allBudgets,
  allDeliveryTimes,
  allProjectTypes,
}: {
  project: Project;
  allBudgets: Array<{ id: number; description: string }>;
  allDeliveryTimes: Array<{ id: number; description: string }>;
  allProjectTypes: Array<{ id: number; description: string }>;
}) {
  // Resolve enum values to descriptions
  const budgetLabel = resolveEnumLabel(project.budget, allBudgets);
  const deliveryTimeLabel = resolveEnumLabel(
    project.deliveryTime,
    allDeliveryTimes
  );
  const projectTypeLabel = resolveEnumLabel(
    project.projectType,
    allProjectTypes
  );

  return (
    <div className="rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-[var(--spacing-10,24px)]">
      <h3 className="text-xl font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-4" style={{ fontFamily: 'Inter' }}>
        Project Scope
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Delivery Time */}
        <div>
          <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-1" style={{ fontFamily: 'Inter' }}>
            Delivery Time
          </h6>
          <p className="text-lg text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>
            {deliveryTimeLabel}
          </p>
          {project.deliveryTime !== undefined &&
            String(project.deliveryTime) === '3' &&
            project.deliveryDate && (
              <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mt-0.5" style={{ fontFamily: 'Inter' }}>
                ({new Date(project.deliveryDate).toLocaleDateString()})
              </p>
            )}
        </div>

        {/* Budget */}
        <div>
          <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-1" style={{ fontFamily: 'Inter' }}>
            Total Available Budget
          </h6>
          <p className="text-lg text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>{budgetLabel}</p>
        </div>

        {/* Project Type */}
        <div>
          <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-1" style={{ fontFamily: 'Inter' }}>
            Project Type
          </h6>
          <p className="text-lg text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>{projectTypeLabel}</p>
        </div>

        {/* URL */}
        {project.url && (
          <div>
            <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-1" style={{ fontFamily: 'Inter' }}>
              Project URL
            </h6>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--state-brand-active,#36d399)] hover:underline break-all"
              style={{ fontFamily: 'Inter' }}
            >
              {project.url}
            </a>
          </div>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <div>
          <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-1" style={{ fontFamily: 'Inter' }}>
            Project Description
          </h6>
          <p className="text-lg text-[var(--text-dark-primary,#f5f5f5)] leading-[var(--line-height-lg,28px)] whitespace-pre-wrap" style={{ fontFamily: 'Inter' }}>
            {project.description}
          </p>
        </div>
      )}

      {/* Objectives */}
      {project.objectives.length > 0 && (
        <div className="mt-6">
          <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-2" style={{ fontFamily: 'Inter' }}>
            Key Objectives
          </h6>
          <ul className="list-disc list-inside space-y-1 text-lg text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>
            {project.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Constraints */}
      {project.constraints.length > 0 && (
        <div className="mt-6">
          <h6 className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-2" style={{ fontFamily: 'Inter' }}>
            Constraints
          </h6>
          <ul className="list-disc list-inside space-y-1 text-lg text-[var(--text-dark-primary,#f5f5f5)]" style={{ fontFamily: 'Inter' }}>
            {project.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves an enum index/value to its description string.
 * Handles both numeric index and string value lookups.
 */
function resolveEnumLabel(
  value: string | number | undefined,
  enumList: Array<{ id?: number; description: string }>
): string {
  if (value === undefined || value === null) return 'Pending';

  // If it's a number, look it up by array index
  if (typeof value === 'number') {
    return enumList[value]?.description ?? 'Pending';
  }

  // If it's a string that parses as a number, try index lookup
  const numValue = Number(value);
  if (!isNaN(numValue)) {
    return enumList[numValue]?.description ?? value;
  }

  // Otherwise return the raw string value
  return value;
}
