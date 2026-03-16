/**
 * PaymentDetailPage - Payment details for a single project
 *
 * Shows detailed payment breakdown for a specific project, including:
 *   - Project-level payment summary
 *   - Per-milestone payment status with workflow state
 *   - Release payment action for clients (when all milestones completed)
 *
 * Mirrors the EJS views/projects/showProjectPayments.ejs.
 */

import { useParams, Link } from 'react-router-dom';
import { usePayment } from '@hooks/usePayments';
import { computeProjectPaymentSummary, isAdvancePaid, isFullyPaid, isZeroPaid } from '@lib/paymentUtils';
import { Spinner, Card, CardContent } from '@components/ui';
import { MilestoneStatusBadge } from '@components/features/projects/MilestoneStatusBadge';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import type { Milestone } from '@/types/index';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = usePayment(id);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-[#9B9B9B]">Loading payment details...</p>
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
            Failed to load payment details
          </h2>
          <p className="text-[#9B9B9B] mb-4">
            {error?.message ?? 'Payment information not found.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => void refetch()}
              className="px-4 py-2 rounded-lg bg-[#36D399] text-[#141414] font-medium hover:shadow-lg transition-shadow"
            >
              Retry
            </button>
            <Link
              to="/payments"
              className="px-4 py-2 rounded-lg border border-[#3D3D3D] text-[#9B9B9B] hover:border-[#555] transition-colors"
            >
              Back to Payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { project, advancePaymentPercentage } = data;
  const summary = computeProjectPaymentSummary(project, advancePaymentPercentage);

  const zeroPaid = project.milestones.filter(isZeroPaid);
  const advancePaid = project.milestones.filter(isAdvancePaid);
  const fullyPaid = project.milestones.filter(isFullyPaid);

  return (
    <div className="px-8 lg:px-14 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-[#9B9B9B]">
        <Link to="/payments" className="hover:text-[#F5F5F5] transition-colors">
          Payments
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#F5F5F5]">{project.title}</span>
      </nav>

      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[#F5F5F5]">{project.title}</h1>
          <Link
            to={`/projects/${project.id}`}
            className="text-xs text-[#36D399] hover:underline"
          >
            View Project
          </Link>
        </div>
        {project.client && (
          <p className="text-sm text-[#9B9B9B] mt-1">
            Client: {project.client.name}
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total Budget Funded" value={`$${summary.totalBudgetFunded}`} />
        <SummaryCard label="Funds Remaining" value={`$${summary.fundsRemaining}`} />
        <SummaryCard label="Awaiting Payment" value={`$${summary.paymentInAdvanced}`} />
        <SummaryCard label="Paid" value={`$${summary.paymentForCompleted}`} />
      </div>

      {/* Milestone sections */}
      <div className="space-y-8">
        {/* Not started milestones */}
        {zeroPaid.length > 0 && (
          <MilestoneSection
            title="Not Started"
            icon="ri-time-line"
            milestones={zeroPaid}
            advancePaymentPercentage={advancePaymentPercentage}
          />
        )}

        {/* In progress / awaiting payment */}
        {advancePaid.length > 0 && (
          <MilestoneSection
            title="In Progress (Advance Payment)"
            icon="ri-loader-4-line"
            milestones={advancePaid}
            advancePaymentPercentage={advancePaymentPercentage}
            showAdvance
          />
        )}

        {/* Fully paid */}
        {fullyPaid.length > 0 && (
          <MilestoneSection
            title="Completed and Paid"
            icon="ri-checkbox-circle-line"
            milestones={fullyPaid}
            advancePaymentPercentage={advancePaymentPercentage}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-[#3D3D3D] bg-[#231F1F]">
      <CardContent className="p-4">
        <p className="text-xs text-[#9B9B9B] uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-[#F5F5F5]">{value}</p>
      </CardContent>
    </Card>
  );
}

function MilestoneSection({
  title,
  icon,
  milestones,
  advancePaymentPercentage,
  showAdvance = false,
}: {
  title: string;
  icon: string;
  milestones: Milestone[];
  advancePaymentPercentage: number;
  showAdvance?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <i className={`${icon} text-[#36D399]`} />
        <h3 className="text-lg font-semibold text-[#F5F5F5]">{title}</h3>
        <span className="text-sm text-[#9B9B9B]">({milestones.length})</span>
      </div>
      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const budget = budgetPlanckToHuman(milestone.budget);
          const advanceAmount =
            Math.round((budget * advancePaymentPercentage) / 100 * 100) / 100;

          return (
            <Card key={milestone.id ?? `ms-${index}`} className="border-[#3D3D3D] bg-[#1A1A1A]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-[#9B9B9B]">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-[#F5F5F5] truncate">
                        {milestone.title}
                      </h4>
                      {milestone.developer && (
                        <p className="text-xs text-[#9B9B9B] mt-0.5">
                          Developer: {milestone.developer.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <MilestoneStatusBadge milestone={milestone} />
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#F5F5F5]">
                        ${formatCurrency(budget)}
                      </p>
                      {showAdvance && advanceAmount > 0 && (
                        <p className="text-xs text-orange-400">
                          {advancePaymentPercentage}% = ${formatCurrency(advanceAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
