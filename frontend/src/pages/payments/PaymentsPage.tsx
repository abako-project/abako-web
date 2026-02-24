/**
 * PaymentsPage - Payment overview for the authenticated user
 *
 * Displays all projects with their payment information, grouped into:
 *   - Awaiting Payment: milestones that are in progress (advance payment)
 *   - Paid: milestones that have been fully paid
 *
 * Shows per-project summaries with:
 *   - Total budget funded
 *   - Funds remaining
 *   - Awaiting payment total
 *   - Paid total
 *
 * Mirrors the EJS views/payments/index.ejs and related partials.
 */

import { Link } from 'react-router-dom';
import { usePayments } from '@hooks/usePayments';
import { computeProjectPaymentSummary, isAdvancePaid, isFullyPaid } from '@lib/paymentUtils';

import { Spinner, Card, CardContent } from '@components/ui';
import { EmptyState } from '@components/shared/EmptyState';
import { MilestoneStatusBadge } from '@components/features/projects/MilestoneStatusBadge';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import type { Project, Milestone, ProjectPaymentSummary } from '@/types/index';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function PaymentsPage() {
  const { data, isLoading, error, refetch } = usePayments();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-[#9B9B9B]">Loading payments...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="px-8 lg:px-14 py-10">
        <div className="max-w-2xl mx-auto p-8 rounded-xl bg-[#231F1F] border border-red-500/30 text-center">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3 block" />
          <h2 className="text-xl font-bold text-[#F5F5F5] mb-2">
            Failed to load payments
          </h2>
          <p className="text-[#9B9B9B] mb-4">
            {error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => void refetch()}
            className="px-4 py-2 rounded-lg bg-[#36D399] text-[#141414] font-medium hover:shadow-lg transition-shadow"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { projects, advancePaymentPercentage } = data;

  // Only show projects that have milestones
  const projectsWithMilestones = projects.filter(
    (project) => project.milestones.length > 0
  );

  // Compute payment summaries for each project
  const summaries = projectsWithMilestones.map((project) =>
    computeProjectPaymentSummary(project, advancePaymentPercentage)
  );

  return (
    <div className="px-8 lg:px-14 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Payments</h1>
        <p className="text-sm text-[#9B9B9B] mt-1">
          Track payment status across all your projects
        </p>
      </div>

      {/* Empty state */}
      {summaries.length === 0 ? (
        <EmptyState
          icon="ri-money-dollar-circle-line"
          title="No payments yet"
          description="Payment information will appear here once your projects have milestones."
        />
      ) : (
        <div className="space-y-8">
          {summaries.map((summary) => (
            <ProjectPaymentCard
              key={summary.project.id}
              summary={summary}
              advancePaymentPercentage={advancePaymentPercentage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Card displaying payment info for a single project.
 */
function ProjectPaymentCard({
  summary,
  advancePaymentPercentage,
}: {
  summary: ProjectPaymentSummary;
  advancePaymentPercentage: number;
}) {
  const { project } = summary;

  return (
    <div className="space-y-4">
      {/* Project title link */}
      <Link
        to={`/projects/${project.id}`}
        className="text-lg font-semibold text-[#F5F5F5] hover:text-[#36D399] transition-colors"
      >
        Project: {project.title}
      </Link>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Project Budget"
          value={`$${formatCurrency(summary.totalBudgetFunded)}`}
          color="text-[#F5F5F5]"
        />
        <StatCard
          label="Escrow Deposited"
          value={`$${formatCurrency(summary.escrowDeposited)}`}
          color={summary.escrowDeposited > 0 ? 'text-purple-400' : 'text-[#9B9B9B]'}
        />
        <StatCard
          label="Funds Remaining"
          value={`$${formatCurrency(summary.fundsRemaining)}`}
          color={summary.fundsRemaining > 0 ? 'text-blue-400' : 'text-[#9B9B9B]'}
        />
        <StatCard
          label="Awaiting Payment"
          value={`$${formatCurrency(summary.paymentInAdvanced)}`}
          color="text-orange-400"
        />
        <StatCard
          label="Paid"
          value={`$${formatCurrency(summary.paymentForCompleted)}`}
          color="text-[#36D399]"
        />
      </div>

      {/* Milestone payment grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Awaiting Payment column */}
        <PaymentColumn
          title="Awaiting Payment"
          count={summary.awaitingPaymentCount}
          milestones={project.milestones.filter(isAdvancePaid)}
          project={project}
          advancePaymentPercentage={advancePaymentPercentage}
          showAdvance
        />

        {/* Paid column */}
        <PaymentColumn
          title="Paid"
          count={summary.paidCount}
          milestones={project.milestones.filter(isFullyPaid)}
          project={project}
          advancePaymentPercentage={advancePaymentPercentage}
          showAdvance={false}
        />
      </div>

      {/* Divider */}
      <div className="border-b border-[#3D3D3D]" />
    </div>
  );
}

/**
 * A single statistic card.
 */
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="border-[#3D3D3D] bg-[#1A1A1A]">
      <CardContent className="p-4">
        <p className="text-xs text-[#9B9B9B] uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * A column showing milestones in a specific payment category.
 */
function PaymentColumn({
  title,
  count,
  milestones,
  project,
  advancePaymentPercentage,
  showAdvance,
}: {
  title: string;
  count: number;
  milestones: Milestone[];
  project: Project;
  advancePaymentPercentage: number;
  showAdvance: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#3D3D3D] text-xs font-medium text-[#F5F5F5]">
          {count}
        </span>
        <h3 className="text-sm font-semibold text-[#F5F5F5]">{title}</h3>
      </div>

      {milestones.length === 0 ? (
        <p className="text-xs text-[#9B9B9B] italic pl-8">
          No milestones in this category.
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <MilestonePaymentItem
              key={milestone.id ?? milestone.title}
              milestone={milestone}
              project={project}
              advancePaymentPercentage={advancePaymentPercentage}
              showAdvance={showAdvance}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A single milestone payment item within a column.
 */
function MilestonePaymentItem({
  milestone,
  project,
  advancePaymentPercentage,
  showAdvance,
}: {
  milestone: Milestone;
  project: Project;
  advancePaymentPercentage: number;
  showAdvance: boolean;
}) {
  const budget = budgetPlanckToHuman(milestone.budget);

  const advanceAmount = Math.round((budget * advancePaymentPercentage) / 100 * 100) / 100;

  return (
    <Card className="border-[#3D3D3D] bg-[#1A1A1A]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-[#F5F5F5] truncate">
              {milestone.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#9B9B9B]">
              {/* Client avatar */}
              {project.client && (
                <span className="flex items-center gap-1">
                  <img
                    className="h-4 w-4 rounded-full object-cover"
                    src={`/clients/${project.clientId}/attachment`}
                    alt={project.client.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/none.png';
                    }}
                  />
                  {project.client.name}
                </span>
              )}
              <span className="text-[#3D3D3D]">|</span>
              <span>{project.title}</span>
            </div>
            {/* Developer assignment */}
            {milestone.developer && (
              <div className="flex items-center gap-1 mt-1 text-xs text-[#9B9B9B]">
                <img
                  className="h-4 w-4 rounded-full object-cover"
                  src={`/developers/${milestone.developerId}/attachment`}
                  alt={milestone.developer.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/none.png';
                  }}
                />
                <span>{milestone.developer.name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <MilestoneStatusBadge milestone={milestone} />
            <span className="text-sm font-semibold text-[#F5F5F5]">
              ${formatCurrency(budget)}
            </span>
            {showAdvance && advanceAmount > 0 && (
              <span className="text-xs text-orange-400">
                ({advancePaymentPercentage}% = ${formatCurrency(advanceAmount)})
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
