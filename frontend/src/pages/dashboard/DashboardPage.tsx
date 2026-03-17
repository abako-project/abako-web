/**
 * DashboardPage - Kanban board dashboard view
 *
 * Displays the authenticated user's milestones grouped by status in a
 * Figma-matching 3-column Kanban layout:
 *   - "Scheduled Milestones": state task_in_progress | pending
 *   - "In Client Review": state in_review | submitted
 *   - "Completed": state completed | paid
 *
 * The "Tasks" tab shows the Kanban board.
 * The "Projects" tab falls through to the existing project-list view.
 *
 * Data is fetched via useDashboard() -> GET /api/dashboard.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { useDashboard } from '@hooks/useProjects';
import { flowProjectState, ProjectState } from '@lib/flowStates';
import type { Project, Milestone, MilestoneRawState } from '@/types/index';
import type { ProjectStateValue } from '@lib/flowStates';
import { Spinner } from '@components/ui/Spinner';
import { Button } from '@components/ui/Button';
import { Card, CardContent } from '@components/ui/Card';
import { TabsLine } from '@components/ui/TabsLine';
import { Avatar } from '@components/ui/Avatar';
import { EmptyState } from '@components/shared/EmptyState';
import { ProjectStateBadge } from '@components/shared/ProjectStateBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A milestone enriched with its parent project reference. */
interface MilestoneWithProject {
  milestone: Milestone;
  project: Project;
}

// ---------------------------------------------------------------------------
// Kanban column definitions
// ---------------------------------------------------------------------------

type KanbanColumnId = 'scheduled' | 'to_review' | 'completed';

interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  states: MilestoneRawState[];
  headerStyle: 'green' | 'dark';
  /** When true, the column container gets a green border accent. */
  accentBorder?: boolean;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'scheduled',
    label: 'Scheduled Milestones',
    states: ['task_in_progress', 'pending'],
    headerStyle: 'green',
  },
  {
    id: 'to_review',
    label: 'To Review',
    states: ['in_review', 'rejected'],
    headerStyle: 'dark',
    accentBorder: true,
  },
  {
    id: 'completed',
    label: 'Completed',
    states: ['completed', 'paid'],
    headerStyle: 'dark',
  },
];

// ---------------------------------------------------------------------------
// State group ordering and metadata (used in Projects tab)
// ---------------------------------------------------------------------------

const STATE_GROUP_ORDER: ProjectStateValue[] = [
  ProjectState.WaitingForProposalApproval,
  ProjectState.ScopeValidationNeeded,
  ProjectState.ProjectInProgress,
  ProjectState.ScopingInProgress,
  ProjectState.WaitingForTeamAssigment,
  ProjectState.ProposalPending,
  ProjectState.ScopeRejected,
  ProjectState.ProposalRejected,
  ProjectState.PaymentReleased,
  ProjectState.Completed,
  ProjectState.CreationError,
  ProjectState.Invalid,
  ProjectState.Cancelled,
  ProjectState.DisputeOpen,
];

const STATE_GROUP_TITLES: Record<ProjectStateValue, string> = {
  [ProjectState.CreationError]: 'Creation Errors',
  [ProjectState.ProposalPending]: 'Proposals Pending Review',
  [ProjectState.WaitingForProposalApproval]: 'Awaiting Proposal Approval',
  [ProjectState.ProposalRejected]: 'Rejected Proposals',
  [ProjectState.ScopingInProgress]: 'Scoping In Progress',
  [ProjectState.ScopeValidationNeeded]: 'Scope Validation Needed',
  [ProjectState.ScopeRejected]: 'Scope Rejected',
  [ProjectState.WaitingForTeamAssigment]: 'Awaiting Team Assignment',
  [ProjectState.ProjectInProgress]: 'Projects In Progress',
  [ProjectState.PaymentReleased]: 'Payment Released',
  [ProjectState.Completed]: 'Completed Projects',
  [ProjectState.Cancelled]: 'Cancelled Projects',
  [ProjectState.DisputeOpen]: 'Open Disputes',
  [ProjectState.Invalid]: 'Other',
};

const STATE_GROUP_ICONS: Record<ProjectStateValue, string> = {
  [ProjectState.CreationError]: 'ri-error-warning-line',
  [ProjectState.ProposalPending]: 'ri-time-line',
  [ProjectState.WaitingForProposalApproval]: 'ri-file-search-line',
  [ProjectState.ProposalRejected]: 'ri-close-circle-line',
  [ProjectState.ScopingInProgress]: 'ri-draft-line',
  [ProjectState.ScopeValidationNeeded]: 'ri-checkbox-circle-line',
  [ProjectState.ScopeRejected]: 'ri-close-circle-line',
  [ProjectState.WaitingForTeamAssigment]: 'ri-team-line',
  [ProjectState.ProjectInProgress]: 'ri-rocket-line',
  [ProjectState.PaymentReleased]: 'ri-money-dollar-circle-line',
  [ProjectState.Completed]: 'ri-check-double-line',
  [ProjectState.Cancelled]: 'ri-forbid-line',
  [ProjectState.DisputeOpen]: 'ri-scales-line',
  [ProjectState.Invalid]: 'ri-question-line',
};

// ---------------------------------------------------------------------------
// Tabs configuration
// ---------------------------------------------------------------------------

const DASHBOARD_TABS = [
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
];

// ---------------------------------------------------------------------------
// Dashboard Page Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isClient = !!user?.clientId;

  const { data, isLoading, isError, error } = useDashboard();

  const [activeTab, setActiveTab] = useState<string>('projects');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all milestones with their parent project
  const allMilestonesWithProject = useMemo<MilestoneWithProject[]>(() => {
    if (!data?.projects) return [];

    const result: MilestoneWithProject[] = [];
    for (const project of data.projects) {
      for (const milestone of project.milestones) {
        result.push({ milestone, project });
      }
    }
    return result;
  }, [data?.projects]);

  // Unique project names for filter chips
  const projectNames = useMemo<string[]>(() => {
    if (!data?.projects) return [];
    return data.projects.map((p) => p.title);
  }, [data?.projects]);

  // Apply project filter + search to milestones
  const filteredMilestones = useMemo<MilestoneWithProject[]>(() => {
    let items = allMilestonesWithProject;

    if (projectFilter !== 'all') {
      items = items.filter((item) => item.project.title === projectFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.milestone.title.toLowerCase().includes(q) ||
          item.milestone.description.toLowerCase().includes(q) ||
          item.project.title.toLowerCase().includes(q)
      );
    }

    return items;
  }, [allMilestonesWithProject, projectFilter, searchQuery]);

  // Group projects by flow state (for Projects tab)
  const groupedProjects = useMemo(() => {
    if (!data?.projects) return new Map<ProjectStateValue, Project[]>();
    const groups = new Map<ProjectStateValue, Project[]>();
    for (const project of data.projects) {
      const state = flowProjectState(project);
      const existing = groups.get(state);
      if (existing) {
        existing.push(project);
      } else {
        groups.set(state, [project]);
      }
    }
    return groups;
  }, [data?.projects]);

  const orderedGroups = useMemo(
    () => STATE_GROUP_ORDER.filter((state) => groupedProjects.has(state)),
    [groupedProjects]
  );

  const totalProjects = data?.projects.length ?? 0;

  // ------- Loading state -------
  if (isLoading) {
    return (
      <div className="px-8 lg:px-[var(--spacing-22,112px)] py-10">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
              Loading dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ------- Error state -------
  if (isError) {
    return (
      <div className="px-8 lg:px-[var(--spacing-22,112px)] py-10">
        <DashboardPageHeader isClient={isClient} onNewProject={() => navigate('/projects/new')} />
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center">
              <i className="ri-error-warning-line text-2xl text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-dark-primary,#f5f5f5)] mb-2">
              Failed to load dashboard
            </h2>
            <p className="text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-4">
              {error?.message ?? 'An unexpected error occurred.'}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ------- Empty state -------
  if (totalProjects === 0) {
    return (
      <div className="px-8 lg:px-[var(--spacing-22,112px)] py-10">
        <DashboardPageHeader isClient={isClient} onNewProject={() => navigate('/projects/new')} />
        <EmptyState
          icon="ri-folder-line"
          title="No projects yet"
          description={
            isClient
              ? 'Create your first project proposal to get started with Abako.'
              : 'You have not been assigned to any projects yet. Projects will appear here once you are assigned as a consultant or developer.'
          }
          action={
            isClient
              ? { label: 'New Project', onClick: () => navigate('/projects/new') }
              : undefined
          }
        />
      </div>
    );
  }

  // ------- Main dashboard -------
  return (
    <div className="min-h-screen bg-[var(--base-surface-1,#141414)]">
      {/* Page header section */}
      <div className="px-8 lg:px-[var(--spacing-22,112px)] pt-[var(--spacing-12,32px)] pb-0">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <h1 className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)]">
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--state-brand-active,#36d399)] hover:underline"
            >
              Learn more about projects
              <i className="ri-arrow-right-s-line" />
            </a>
            {isClient && (
              <button
                onClick={() => navigate('/projects/new')}
                className="flex items-center justify-center gap-2 h-9 px-4 bg-[var(--state-brand-active,#36d399)] border border-[var(--colors-alpha-dark-200,rgba(255,255,255,0.12))] rounded-[var(--radi-6,12px)] hover:brightness-110 transition-all"
              >
                <i className="ri-add-line text-base text-[var(--text-light-primary,#141414)]" />
                <span className="text-sm font-semibold text-[var(--text-light-primary,#141414)]">
                  New Project
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <TabsLine
          tabs={DASHBOARD_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Content area */}
      <div className="px-8 lg:px-[var(--spacing-22,112px)] py-8">
        {activeTab === 'tasks' ? (
          <TasksKanbanView
            milestones={filteredMilestones}
            allMilestones={allMilestonesWithProject}
            projectNames={projectNames}
            projectFilter={projectFilter}
            searchQuery={searchQuery}
            isClient={isClient}
            onProjectFilterChange={setProjectFilter}
            onSearchChange={setSearchQuery}
            onNavigate={(projectId) => navigate(`/projects/${projectId}`)}
            onReviewMilestone={(projectId, milestoneId) =>
              navigate(`/projects/${projectId}/milestones/${milestoneId}/review`)
            }
          />
        ) : (
          <ProjectsListView
            orderedGroups={orderedGroups}
            groupedProjects={groupedProjects}
            isClient={isClient}
            onProjectClick={(id) => navigate(`/projects/${id}`)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page Header (minimal — used only in loading/error/empty states)
// ---------------------------------------------------------------------------

interface DashboardPageHeaderProps {
  isClient: boolean;
  onNewProject: () => void;
}

function DashboardPageHeader({ isClient, onNewProject }: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
      <h1
        className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)]"      >
        Dashboard
      </h1>
      {isClient && (
        <Button onClick={onNewProject}>
          <i className="ri-add-line mr-2" />
          New Project
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks Kanban View
// ---------------------------------------------------------------------------

interface TasksKanbanViewProps {
  milestones: MilestoneWithProject[];
  allMilestones: MilestoneWithProject[];
  projectNames: string[];
  projectFilter: string;
  searchQuery: string;
  isClient: boolean;
  onProjectFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onNavigate: (projectId: string) => void;
  onReviewMilestone: (projectId: string, milestoneId: string) => void;
}

function TasksKanbanView({
  milestones,
  allMilestones,
  projectNames,
  projectFilter,
  searchQuery,
  isClient,
  onProjectFilterChange,
  onSearchChange,
  onNavigate,
  onReviewMilestone,
}: TasksKanbanViewProps) {
  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Project filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip
            label="All Projects"
            active={projectFilter === 'all'}
            onClick={() => onProjectFilterChange('all')}
          />
          {projectNames.map((name) => (
            <FilterChip
              key={name}
              label={name}
              active={projectFilter === name}
              onClick={() => onProjectFilterChange(name)}
            />
          ))}
        </div>

        {/* Search input */}
        <div className="relative sm:ml-auto">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] text-sm pointer-events-none" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full sm:w-[220px] pl-9 pr-3 rounded-[8px] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] text-sm text-[var(--text-dark-primary,#f5f5f5)] placeholder:text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] focus:outline-none focus:ring-1 focus:ring-[var(--state-brand-active,#36d399)]"
            style={{ fontFamily: 'Inter' }}
          />
        </div>
      </div>

      {/* Kanban board — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnMilestones = milestones.filter(({ milestone }) =>
            milestone.state !== undefined &&
            (column.states as string[]).includes(milestone.state)
          );

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              milestones={columnMilestones}
              isClient={isClient}
              onNavigate={onNavigate}
              onReviewMilestone={onReviewMilestone}
            />
          );
        })}
      </div>

      {/* Show total milestone count */}
      {allMilestones.length > 0 && (
        <p className="mt-4 text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          Showing {milestones.length} of {allMilestones.length} milestone
          {allMilestones.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Chip
// ---------------------------------------------------------------------------

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'inline-flex items-center h-7 px-3 rounded-[100px] text-xs font-medium bg-[var(--state-brand-active,#36d399)] text-[var(--text-light-primary,#141414)] transition-colors'
          : 'inline-flex items-center h-7 px-3 rounded-[100px] text-xs font-medium bg-[var(--base-surface-2,#231f1f)] border border-[var(--base-border,#3d3d3d)] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] hover:text-[var(--text-dark-primary,#f5f5f5)] transition-colors'
      }
      style={{ fontFamily: 'Inter' }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  column: KanbanColumn;
  milestones: MilestoneWithProject[];
  isClient: boolean;
  onNavigate: (projectId: string) => void;
  onReviewMilestone: (projectId: string, milestoneId: string) => void;
}

function KanbanColumn({ column, milestones, isClient, onNavigate, onReviewMilestone }: KanbanColumnProps) {
  const isGreen = column.headerStyle === 'green';

  return (
    <div className={`flex flex-col gap-3 bg-[var(--base-fill-1,#333)] rounded-[var(--radi-6,12px)] px-3 py-4 ${
      column.accentBorder ? 'border border-[var(--state-brand-active,#36d399)]' : ''
    }`}>
      {/* Column header badge */}
      <div
        className={`flex items-center gap-2 px-3 h-10 w-full rounded-[var(--radi-6,12px)] shadow-[0.5px_0.5px_3px_0px_rgba(255,255,255,0.08)] shrink-0 ${
          isGreen
            ? 'bg-[var(--state-brand-active,#36d399)]'
            : 'bg-[var(--base-surface-2,#231f1f)] border border-[var(--base-border,#3d3d3d)]'
        }`}
      >
        <span
          className={`flex items-center justify-center w-6 h-6 rounded-[8px] text-sm font-semibold flex-shrink-0 ${
            isGreen
              ? 'bg-[rgba(0,0,0,0.15)] text-[var(--text-light-primary,#141414)]'
              : 'bg-[var(--base-fill-2,#3d3d3d)] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]'
          }`}
        >
          {milestones.length}
        </span>
        <span
          className={`text-lg font-semibold leading-[28px] ${
            isGreen ? 'text-[var(--text-light-primary,#141414)]' : 'text-[var(--text-dark-primary,#f5f5f5)]'
          }`}
        >
          {column.label}
        </span>
      </div>

      {/* Cards */}
      {milestones.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            No milestones
          </p>
        </div>
      ) : (
        milestones.map(({ milestone, project }) => (
          <MilestoneCard
            key={milestone.id ?? `${project.id}-${milestone.title}`}
            milestone={milestone}
            project={project}
            isClient={isClient}
            onClick={() => onNavigate(project.id)}
            onReviewMilestone={onReviewMilestone}
          />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Milestone Card
// ---------------------------------------------------------------------------

interface MilestoneCardProps {
  milestone: Milestone;
  project: Project;
  isClient: boolean;
  onClick: () => void;
  onReviewMilestone: (projectId: string, milestoneId: string) => void;
}

function MilestoneCard({ milestone, project, isClient, onClick, onReviewMilestone }: MilestoneCardProps) {
  const user = useAuthStore((state) => state.user);
  const isDeveloper = !!user?.developerId;
  const developerName = milestone.developer?.name ?? project.consultant?.name ?? 'Unassigned';
  const githubUsername =
    milestone.developer?.githubUsername ?? project.consultant?.githubUsername;
  const developerAvatar = githubUsername
    ? `https://github.com/${githubUsername}.png?size=56`
    : undefined;

  const deliveryDate = formatDeliveryDate(milestone.deliveryDate);
  const showSubmitButton = isDeveloper && milestone.state === 'task_in_progress';
  const showReviewButton = isClient && milestone.state === 'in_review' && !!milestone.id;
  const isRejected = milestone.state === 'rejected';

  return (
    <div
      className="bg-[var(--base-surface-1,#141414)] border border-[var(--base-border,#3d3d3d)] rounded-[var(--radi-6,12px)] p-3 cursor-pointer hover:border-[var(--state-brand-active,#36d399)] transition-colors shadow-[0.5px_0.5px_3px_0px_rgba(255,255,255,0.08)]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open project: ${project.title} — ${milestone.title}`}
    >
      {/* Card text content */}
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold text-[var(--text-dark-primary,#f5f5f5)] leading-[28px]">
          {milestone.title}
        </p>
        {milestone.description && (
          <p className="text-base font-normal text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] leading-[24px] line-clamp-2">
            {milestone.description}
          </p>
        )}
      </div>

      {/* Project name chip + rejected badge */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center h-6 px-[10px] rounded-[var(--radi-6,12px)] text-xs font-medium bg-[rgba(54,211,153,0.12)] text-[var(--state-brand-active,#36d399)] border border-[rgba(54,211,153,0.2)]">
          {project.title}
        </span>
        {isRejected && (
          <span className="inline-flex items-center h-6 px-[10px] rounded-[var(--radi-6,12px)] text-xs font-medium bg-[rgba(239,68,68,0.12)] text-red-400 border border-[rgba(239,68,68,0.2)]">
            Rejected
          </span>
        )}
      </div>

      {/* Actions row */}
      <div className="mt-4 flex items-center justify-between gap-2 h-9">
        {/* Left: avatar + name */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={developerAvatar}
            alt={developerName}
            size="sm"
            className="w-7 h-7 flex-shrink-0 border border-[var(--base-border,#3d3d3d)]"
          />
          <span className="text-xs font-medium text-[var(--text-dark-primary,#f5f5f5)] truncate max-w-[100px]">
            {developerName}
          </span>
        </div>

        {/* Right: date badge + action button */}
        <div className="flex items-center gap-[10px] shrink-0">
          {deliveryDate && (
            <span className="inline-flex items-center h-6 px-[10px] rounded-[var(--radi-6,12px)] bg-[var(--base-surface-2,#231f1f)] border border-[var(--base-border,#3d3d3d)] shadow-[0.5px_0.5px_3px_0px_rgba(255,255,255,0.08)] text-xs font-medium text-[var(--text-dark-primary,#f5f5f5)]">
              {deliveryDate}
            </span>
          )}
          {showSubmitButton && (
            <button
              className="flex-shrink-0 h-9 px-3 rounded-[var(--radi-6,12px)] bg-[var(--state-brand-active,#36d399)] border border-[var(--colors-alpha-dark-200,rgba(255,255,255,0.12))] text-sm font-semibold text-[var(--text-light-primary,#141414)] hover:brightness-110 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Submit for Review
            </button>
          )}
          {showReviewButton && (
            <button
              className="flex-shrink-0 h-9 px-3 rounded-[var(--radi-6,12px)] bg-[var(--state-brand-active,#36d399)] border border-[var(--colors-alpha-dark-200,rgba(255,255,255,0.12))] text-sm font-semibold text-[var(--text-light-primary,#141414)] hover:brightness-110 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onReviewMilestone(project.id, milestone.id!);
              }}
            >
              Review Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects List View (Projects tab)
// ---------------------------------------------------------------------------

interface ProjectsListViewProps {
  orderedGroups: ProjectStateValue[];
  groupedProjects: Map<ProjectStateValue, Project[]>;
  isClient: boolean;
  onProjectClick: (id: string) => void;
}

function ProjectsListView({
  orderedGroups,
  groupedProjects,
  isClient,
  onProjectClick,
}: ProjectsListViewProps) {
  if (orderedGroups.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          No projects to display.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {orderedGroups.map((state) => {
        const projects = groupedProjects.get(state);
        if (!projects || projects.length === 0) return null;

        return (
          <StateGroupSection
            key={state}
            state={state}
            projects={projects}
            onProjectClick={onProjectClick}
            isClient={isClient}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// State Group Section (used in Projects tab)
// ---------------------------------------------------------------------------

interface StateGroupSectionProps {
  state: ProjectStateValue;
  projects: Project[];
  onProjectClick: (id: string) => void;
  isClient: boolean;
}

function StateGroupSection({
  state,
  projects,
  onProjectClick,
  isClient,
}: StateGroupSectionProps) {
  const title = STATE_GROUP_TITLES[state];
  const icon = STATE_GROUP_ICONS[state];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <i
          className={`${icon} text-lg text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]`}
        />
        <h2 className="text-lg font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
          {title}
        </h2>
        <span className="ml-1 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          ({projects.length})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick(project.id)}
            isClient={isClient}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Project Card (used in Projects tab)
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  isClient: boolean;
}

function ProjectCard({ project, onClick, isClient }: ProjectCardProps) {
  const clientName = project.client?.name ?? 'No client';
  const consultantName = project.consultant?.name ?? 'Unassigned';

  const budgetDisplay =
    typeof project.budget === 'number'
      ? `Budget tier ${project.budget}`
      : (project.budget ?? '--');

  const deliveryTimeDisplay =
    typeof project.deliveryTime === 'number'
      ? `Delivery tier ${project.deliveryTime}`
      : (project.deliveryTime ?? '--');

  return (
    <Card
      className="cursor-pointer hover:border-[var(--state-brand-active,#36d399)]/40 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Title and badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-[var(--text-dark-primary,#f5f5f5)] leading-snug line-clamp-2 group-hover:text-[var(--state-brand-active,#36d399)] transition-colors">
            {project.title}
          </h3>
          <ProjectStateBadge project={project} className="shrink-0" />
        </div>

        {/* Users */}
        <div className="flex items-center gap-4 mb-4 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          {isClient ? (
            <div className="flex items-center gap-1.5">
              <i className="ri-user-star-line text-base" />
              <span className="truncate max-w-[140px]">{consultantName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <i className="ri-user-line text-base" />
              <span className="truncate max-w-[140px]">{clientName}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
          <div className="flex items-center gap-1.5">
            <i className="ri-money-dollar-circle-line text-base" />
            <span className="truncate">{budgetDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="ri-time-line text-base" />
            <span className="truncate">{deliveryTimeDisplay}</span>
          </div>
        </div>

        {/* Milestones count */}
        {project.milestones.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--base-border,#3d3d3d)] flex items-center gap-1.5 text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            <i className="ri-list-check-2 text-base" />
            <span>
              {project.milestones.length} milestone
              {project.milestones.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a milestone delivery date to a human-readable short date string.
 * Accepts ISO string, Unix timestamp (ms), or undefined.
 */
function formatDeliveryDate(value?: string | number): string | null {
  if (!value) return null;

  try {
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}
