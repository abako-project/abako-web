/**
 * MilestoneCard - Displays a single milestone with its state badge
 *
 * Shows: title, description, developer name, delivery time, role,
 * skills, proficiency, availability, budget, and state badge.
 *
 * Mirrors the EJS partial milestones/info/_showMilestone.ejs.
 */

import { Card, CardContent } from '@components/ui';
import { MilestoneStatusBadge } from '@components/features/projects/MilestoneStatusBadge';
import { cn } from '@lib/cn';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import type { Milestone } from '@/types/index';

interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  allDeliveryTimes?: Array<{ id?: number; description: string }>;
  className?: string;
}

/**
 * Resolves the delivery time description from the enum index.
 */
function getDeliveryTimeLabel(
  deliveryTime: string | number | undefined,
  allDeliveryTimes?: Array<{ id?: number; description: string }>
): string {
  if (deliveryTime === undefined || deliveryTime === null) {
    return 'Delivery Time Pending';
  }
  if (allDeliveryTimes && typeof deliveryTime === 'number') {
    return allDeliveryTimes[deliveryTime]?.description ?? 'Delivery Time Pending';
  }
  if (typeof deliveryTime === 'string') {
    return deliveryTime;
  }
  return 'Delivery Time Pending';
}

/**
 * Formats the availability for display.
 */
function formatAvailability(milestone: Milestone): string | null {
  if (milestone.availability) {
    if (milestone.availability === 'fulltime') return 'Full Time';
    if (milestone.availability === 'parttime') return 'Part Time';
    if (milestone.availability === 'hourly') {
      return `${milestone.neededHours ?? 0} Hours/Week`;
    }
    // Handle enum-style values
    if (milestone.availability === 'FullTime') return 'Full Time';
    if (milestone.availability === 'PartTime') return 'Part Time';
    if (milestone.availability === 'WeeklyHours') {
      return `${milestone.neededHours ?? 0} Hours/Week`;
    }
    return milestone.availability;
  }
  return null;
}

export function MilestoneCard({
  milestone,
  index,
  allDeliveryTimes,
  className,
}: MilestoneCardProps) {
  const deliveryLabel = getDeliveryTimeLabel(
    milestone.deliveryTime,
    allDeliveryTimes
  );
  const availability = formatAvailability(milestone);
  const budgetDisplay =
    milestone.budget !== undefined && milestone.budget !== null
      ? `${budgetPlanckToHuman(milestone.budget).toLocaleString('en-US')} DUSD`
      : 'Budget Pending';

  return (
    <Card className={cn('border-[#3D3D3D] bg-[#1A1A1A]', className)}>
      <CardContent className="p-5">
        {/* Header row: number, title, budget, state */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Progress indicator dot */}
            <div className="flex flex-col items-center pt-1.5">
              <div className="h-3 w-3 rounded-full bg-[#36D399] shrink-0" />
              <div className="mt-1 h-full w-px bg-[#3D3D3D]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-semibold text-[#F5F5F5]">
                  {index + 1}. {milestone.title}
                </h4>
                <span className="text-xs font-medium text-[#36D399]">
                  [{budgetDisplay}]
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#9B9B9B]">
                Delivery: {deliveryLabel}
              </p>
            </div>
          </div>

          <MilestoneStatusBadge milestone={milestone} />
        </div>

        {/* Description */}
        {milestone.description && (
          <p className="mb-3 text-sm text-[#C0C0C0] leading-relaxed pl-6">
            {milestone.description}
          </p>
        )}

        {/* Role / Skills / Proficiency / Availability */}
        {(milestone.role || milestone.skills?.length || milestone.proficiency || availability) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9B9B9B] pl-6 mb-3">
            {milestone.role && (
              <span className="rounded bg-[#231F1F] px-2 py-0.5 border border-[#3D3D3D]">
                {milestone.role}
              </span>
            )}
            {milestone.proficiency && (
              <span className="rounded bg-[#231F1F] px-2 py-0.5 border border-[#3D3D3D]">
                {milestone.proficiency}
              </span>
            )}
            {milestone.skills?.map((skill) => (
              <span
                key={skill}
                className="rounded bg-[#231F1F] px-2 py-0.5 border border-[#3D3D3D]"
              >
                {skill}
              </span>
            ))}
            {availability && (
              <span className="rounded bg-[#231F1F] px-2 py-0.5 border border-[#3D3D3D]">
                {availability}
              </span>
            )}
          </div>
        )}

        {/* Developer assignment */}
        <div className="flex items-center gap-2 text-xs text-[#9B9B9B] pl-6">
          {milestone.developerId ? (
            <>
              <img
                className="h-5 w-5 rounded-full object-cover"
                src={`/developers/${milestone.developerId}/attachment`}
                alt={milestone.developer?.name ?? 'Developer'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/none.png';
                }}
              />
              <span>{milestone.developer?.name ?? 'Assigned Developer'}</span>
            </>
          ) : (
            <>
              <div className="h-5 w-5 rounded-full bg-[#3D3D3D] flex items-center justify-center">
                <i className="ri-user-line text-[10px] text-[#9B9B9B]" />
              </div>
              <span className="italic">Unassigned</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
