/**
 * ProjectStateBadge - Renders a colored badge for a project's flow state.
 *
 * Uses flowProjectState() from lib/flowStates.ts to compute the logical
 * state from the raw project data, then maps it to a human-readable label
 * and a color scheme.
 *
 * Color mapping:
 *   - ProposalPending:             yellow
 *   - WaitingForProposalApproval:  orange
 *   - ScopingInProgress:           blue
 *   - ScopeValidationNeeded:       purple
 *   - ProjectInProgress:           green
 *   - Completed / PaymentReleased: gray
 *   - ProposalRejected / ScopeRejected: red
 *   - CreationError / Invalid:     red
 *   - WaitingForTeamAssigment:     teal
 *   - Cancelled:                   gray
 *   - DisputeOpen:                 red
 */

import { flowProjectState, ProjectState } from '@lib/flowStates';
import type { Project, ScopeSession } from '@/types/index';
import type { ProjectStateValue } from '@lib/flowStates';
import { cn } from '@lib/cn';

interface ProjectStateBadgeProps {
  project: Project;
  scope?: ScopeSession;
  className?: string;
}

/** Map each ProjectState to a human-readable label. */
const STATE_LABELS: Record<ProjectStateValue, string> = {
  [ProjectState.CreationError]: 'Creation Error',
  [ProjectState.ProposalPending]: 'Proposal Pending',
  [ProjectState.WaitingForProposalApproval]: 'Awaiting Approval',
  [ProjectState.ProposalRejected]: 'Proposal Rejected',
  [ProjectState.ScopingInProgress]: 'Scoping In Progress',
  [ProjectState.ScopeValidationNeeded]: 'Scope Validation Needed',
  [ProjectState.ScopeRejected]: 'Scope Rejected',
  [ProjectState.WaitingForTeamAssigment]: 'Awaiting Team Assignment',
  [ProjectState.ProjectInProgress]: 'In Progress',
  [ProjectState.PaymentReleased]: 'Payment Released',
  [ProjectState.Completed]: 'Completed',
  [ProjectState.Cancelled]: 'Cancelled',
  [ProjectState.DisputeOpen]: 'Dispute Open',
  [ProjectState.Invalid]: 'Unknown',
};

/**
 * Map each ProjectState to Tailwind background + text color classes.
 * Uses inline HSL values to match the dark theme.
 */
const STATE_COLORS: Record<ProjectStateValue, string> = {
  [ProjectState.CreationError]:
    'bg-red-500/15 text-red-400 border-red-500/30',
  [ProjectState.ProposalPending]:
    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  [ProjectState.WaitingForProposalApproval]:
    'bg-orange-500/15 text-orange-400 border-orange-500/30',
  [ProjectState.ProposalRejected]:
    'bg-red-500/15 text-red-400 border-red-500/30',
  [ProjectState.ScopingInProgress]:
    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  [ProjectState.ScopeValidationNeeded]:
    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  [ProjectState.ScopeRejected]:
    'bg-red-500/15 text-red-400 border-red-500/30',
  [ProjectState.WaitingForTeamAssigment]:
    'bg-teal-500/15 text-teal-400 border-teal-500/30',
  [ProjectState.ProjectInProgress]:
    'bg-green-500/15 text-green-400 border-green-500/30',
  [ProjectState.PaymentReleased]:
    'bg-gray-500/15 text-gray-400 border-gray-500/30',
  [ProjectState.Completed]:
    'bg-gray-500/15 text-gray-400 border-gray-500/30',
  [ProjectState.Cancelled]:
    'bg-gray-500/15 text-gray-400 border-gray-500/30',
  [ProjectState.DisputeOpen]:
    'bg-red-500/15 text-red-400 border-red-500/30',
  [ProjectState.Invalid]:
    'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

/** Map each ProjectState to a tooltip description in Spanish. */
const STATE_TOOLTIPS: Record<ProjectStateValue, string> = {
  [ProjectState.CreationError]: 'Ocurrió un error al crear la propuesta del cliente.',
  [ProjectState.ProposalPending]: 'La propuesta fue enviada y está esperando que la DAO asigne un consultor.',
  [ProjectState.WaitingForProposalApproval]: 'Un consultor fue asignado y debe aceptar o rechazar la propuesta.',
  [ProjectState.ProposalRejected]: 'El consultor rechazó la propuesta del cliente.',
  [ProjectState.ScopingInProgress]: 'El consultor está definiendo el alcance y los hitos del proyecto.',
  [ProjectState.ScopeValidationNeeded]: 'El alcance fue enviado y espera la validación del cliente.',
  [ProjectState.ScopeRejected]: 'El cliente rechazó el alcance propuesto.',
  [ProjectState.WaitingForTeamAssigment]: 'El alcance fue aprobado, falta asignar al equipo de desarrollo.',
  [ProjectState.ProjectInProgress]: 'El equipo está trabajando en los hitos del proyecto.',
  [ProjectState.PaymentReleased]: 'El pago fue liberado al equipo.',
  [ProjectState.Completed]: 'El proyecto fue completado, evaluado y pagado.',
  [ProjectState.Invalid]: 'Estado no reconocido.',
};

export function ProjectStateBadge({
  project,
  scope,
  className,
}: ProjectStateBadgeProps) {
  const state = flowProjectState(project, scope);
  const label = STATE_LABELS[state];
  const colors = STATE_COLORS[state];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colors,
        className
      )}
      title={STATE_TOOLTIPS[state]}
    >
      {label}
    </span>
  );
}
