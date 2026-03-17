import { describe, it, expect } from 'vitest';
import {
  flowProjectState,
  flowMilestoneState,
  ProjectState,
  MilestoneState,
} from './flowStates';
import type { Project, Milestone, ScopeSession } from '@/types/index';

// ---------------------------------------------------------------------------
// Helpers — build minimal valid objects without repeating boilerplate
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    title: 'Test project',
    clientId: 'client-1',
    milestones: [],
    objectives: [],
    constraints: [],
    ...overrides,
  };
}

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    title: 'Test milestone',
    description: 'Description',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// flowProjectState — ProjectState tests
// ---------------------------------------------------------------------------

describe('flowProjectState', () => {
  describe('CreationError', () => {
    it('returns CreationError when creationError is defined', () => {
      const project = makeProject({ creationError: 'something went wrong' });
      expect(flowProjectState(project)).toBe(ProjectState.CreationError);
    });

    it('CreationError takes priority over missing consultantId', () => {
      const project = makeProject({ creationError: 'err', consultantId: undefined });
      expect(flowProjectState(project)).toBe(ProjectState.CreationError);
    });
  });

  describe('ProposalPending', () => {
    it('returns ProposalPending when no consultantId is assigned', () => {
      const project = makeProject({ consultantId: undefined });
      expect(flowProjectState(project)).toBe(ProjectState.ProposalPending);
    });
  });

  describe('WaitingForProposalApproval', () => {
    it('returns WaitingForProposalApproval when state is deployed, no scope draft, no milestones with IDs', () => {
      const project = makeProject({
        consultantId: 'cons-1',
        state: 'deployed',
        coordinatorApprovalStatus: undefined,
        milestones: [],
      });
      expect(flowProjectState(project)).toBe(ProjectState.WaitingForProposalApproval);
    });

    it('returns WaitingForProposalApproval when scope belongs to a different project', () => {
      const project = makeProject({
        id: 'proj-1',
        consultantId: 'cons-1',
        state: 'deployed',
        coordinatorApprovalStatus: undefined,
        milestones: [],
      });
      const scope: ScopeSession = { projectId: 'proj-999', milestones: [] };
      expect(flowProjectState(project, scope)).toBe(ProjectState.WaitingForProposalApproval);
    });

    it('returns WaitingForProposalApproval when milestones have no IDs', () => {
      const project = makeProject({
        consultantId: 'cons-1',
        state: 'deployed',
        coordinatorApprovalStatus: undefined,
        milestones: [makeMilestone({ id: undefined })],
      });
      expect(flowProjectState(project)).toBe(ProjectState.WaitingForProposalApproval);
    });
  });

  describe('ScopingInProgress', () => {
    it('returns ScopingInProgress when state is deployed and scope draft matches the project', () => {
      const project = makeProject({
        id: 'proj-1',
        consultantId: 'cons-1',
        state: 'deployed',
        coordinatorApprovalStatus: undefined,
        milestones: [],
      });
      const scope: ScopeSession = { projectId: 'proj-1', milestones: [] };
      expect(flowProjectState(project, scope)).toBe(ProjectState.ScopingInProgress);
    });

    it('returns ScopingInProgress when state is deployed and milestones already have IDs', () => {
      const project = makeProject({
        consultantId: 'cons-1',
        state: 'deployed',
        coordinatorApprovalStatus: undefined,
        milestones: [makeMilestone({ id: 'ms-1' })],
      });
      expect(flowProjectState(project)).toBe(ProjectState.ScopingInProgress);
    });
  });

  describe('ScopeValidationNeeded', () => {
    it('returns ScopeValidationNeeded when state is scope_proposed', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'scope_proposed' });
      expect(flowProjectState(project)).toBe(ProjectState.ScopeValidationNeeded);
    });
  });

  describe('ScopeRejected', () => {
    it('returns ScopeRejected when state is scope_rejected', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'scope_rejected' });
      expect(flowProjectState(project)).toBe(ProjectState.ScopeRejected);
    });
  });

  describe('WaitingForTeamAssigment', () => {
    it('returns WaitingForTeamAssigment when state is scope_accepted', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'scope_accepted' });
      expect(flowProjectState(project)).toBe(ProjectState.WaitingForTeamAssigment);
    });
  });

  describe('ProjectInProgress', () => {
    it('returns ProjectInProgress when state is team_assigned', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'team_assigned' });
      expect(flowProjectState(project)).toBe(ProjectState.ProjectInProgress);
    });
  });

  describe('Completed', () => {
    it('returns Completed when state is completed', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'completed' });
      expect(flowProjectState(project)).toBe(ProjectState.Completed);
    });
  });

  describe('PaymentReleased', () => {
    it('returns PaymentReleased when state is payment_released', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'payment_released' });
      expect(flowProjectState(project)).toBe(ProjectState.PaymentReleased);
    });
  });

  describe('ProposalRejected', () => {
    it('returns ProposalRejected when state is rejected_by_coordinator', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'rejected_by_coordinator' });
      expect(flowProjectState(project)).toBe(ProjectState.ProposalRejected);
    });
  });

  describe('Cancelled', () => {
    it('returns Cancelled when state is cancelled', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'cancelled' });
      expect(flowProjectState(project)).toBe(ProjectState.Cancelled);
    });
  });

  describe('DisputeOpen', () => {
    it('returns DisputeOpen when state is dispute_open', () => {
      const project = makeProject({ consultantId: 'cons-1', state: 'dispute_open' });
      expect(flowProjectState(project)).toBe(ProjectState.DisputeOpen);
    });
  });

  describe('Invalid', () => {
    it('returns Invalid when state is an unrecognized string', () => {
      // Cast through unknown to simulate a value that bypasses TypeScript's
      // exhaustive type check — mirrors what happens with unexpected API data.
      const project = makeProject({ consultantId: 'cons-1', state: 'unknown_state' as unknown as 'deployed' });
      expect(flowProjectState(project)).toBe(ProjectState.Invalid);
    });

    it('returns Invalid when project has a consultantId but undefined state', () => {
      const project = makeProject({ consultantId: 'cons-1', state: undefined });
      expect(flowProjectState(project)).toBe(ProjectState.Invalid);
    });
  });
});

// ---------------------------------------------------------------------------
// flowMilestoneState — MilestoneState tests
// ---------------------------------------------------------------------------

describe('flowMilestoneState', () => {
  it('returns CreatingMilestone when state is undefined', () => {
    const milestone = makeMilestone({ state: undefined });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.CreatingMilestone);
  });

  it('returns WaitingDeveloperAssignation when state is pending', () => {
    const milestone = makeMilestone({ state: 'pending' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.WaitingDeveloperAssignation);
  });

  it('returns WaitingDeveloperAcceptAssignation when state is waiting_developer_accept_assignation', () => {
    const milestone = makeMilestone({ state: 'waiting_developer_accept_assignation' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.WaitingDeveloperAcceptAssignation);
  });

  it('returns MilestoneInProgress when state is task_in_progress', () => {
    const milestone = makeMilestone({ state: 'task_in_progress' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.MilestoneInProgress);
  });

  it('returns WaitingClientAcceptSubmission when state is in_review', () => {
    const milestone = makeMilestone({ state: 'in_review' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.WaitingClientAcceptSubmission);
  });

  it('returns MilestoneCompleted when state is completed', () => {
    const milestone = makeMilestone({ state: 'completed' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.MilestoneCompleted);
  });

  it('returns SubmissionRejectedByClient when state is rejected', () => {
    const milestone = makeMilestone({ state: 'rejected' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.SubmissionRejectedByClient);
  });

  it('returns Paid when state is paid', () => {
    const milestone = makeMilestone({ state: 'paid' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.Paid);
  });

  it('returns Invalid for an unrecognized state', () => {
    const milestone = makeMilestone({ state: 'bad_state' as unknown as 'pending' });
    expect(flowMilestoneState(milestone)).toBe(MilestoneState.Invalid);
  });
});
