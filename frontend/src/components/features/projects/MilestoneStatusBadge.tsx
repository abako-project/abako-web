/**
 * MilestoneStatusBadge - Displays a milestone's current flow state
 *
 * Computes the milestone state via flowMilestoneState() and renders
 * a colored badge with a human-readable label.
 */

import { cn } from '@lib/cn';
import {
  flowMilestoneState,
  MilestoneState,
  type MilestoneStateValue,
} from '@lib/flowStates';
import type { Milestone } from '@/types/index';

interface MilestoneStatusBadgeProps {
  milestone: Milestone;
  className?: string;
}

/** Maps milestone states to display labels. */
const STATE_LABELS: Record<MilestoneStateValue, string> = {
  [MilestoneState.CreatingMilestone]: 'Draft',
  [MilestoneState.WaitingDeveloperAssignation]: 'Awaiting Developer',
  [MilestoneState.WaitingDeveloperAcceptAssignation]: 'Awaiting Developer',
  [MilestoneState.MilestoneInProgress]: 'In Progress',
  [MilestoneState.WaitingClientAcceptSubmission]: 'Awaiting Review',
  [MilestoneState.SubmissionRejectedByClient]: 'Rejected',
  [MilestoneState.MilestoneCompleted]: 'Completed',
  [MilestoneState.AwaitingPayment]: 'Awaiting Payment',
  [MilestoneState.Paid]: 'Paid',
  [MilestoneState.Invalid]: 'Unknown',
};

/** Maps milestone states to Tailwind color classes. */
const STATE_COLORS: Record<MilestoneStateValue, string> = {
  [MilestoneState.CreatingMilestone]:
    'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [MilestoneState.WaitingDeveloperAssignation]:
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [MilestoneState.WaitingDeveloperAcceptAssignation]:
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [MilestoneState.MilestoneInProgress]:
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [MilestoneState.WaitingClientAcceptSubmission]:
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [MilestoneState.SubmissionRejectedByClient]:
    'bg-red-500/20 text-red-400 border-red-500/30',
  [MilestoneState.MilestoneCompleted]:
    'bg-green-500/20 text-green-400 border-green-500/30',
  [MilestoneState.AwaitingPayment]:
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [MilestoneState.Paid]:
    'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [MilestoneState.Invalid]:
    'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function MilestoneStatusBadge({
  milestone,
  className,
}: MilestoneStatusBadgeProps) {
  const state = flowMilestoneState(milestone);
  const label = STATE_LABELS[state];
  const colors = STATE_COLORS[state];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colors,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
