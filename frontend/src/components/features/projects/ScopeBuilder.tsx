/**
 * ScopeBuilder - Form to create/edit milestones for a project scope
 *
 * This is the React equivalent of the EJS milestone creation flow:
 * - milestones/edit/_formMilestone.ejs (milestone form fields)
 * - milestones/newMilestone.ejs (new milestone page)
 * - milestones/editMilestones.ejs (milestones list edit)
 * - projects/actions/body/__consultantSubmitScope.ejs (scope submit)
 *
 * Key differences from the EJS version:
 * - All milestones are managed in local state instead of server session
 * - Milestones are sent directly in the submit scope API call body
 * - No page navigation; everything is in a single component
 *
 * Used by consultants in the ScopingInProgress or ScopeRejected states.
 */

import { useState, useCallback } from 'react';
import { Button, Input, Label, Card, CardContent } from '@components/ui';
import { useEnums } from '@hooks/useEnums';
import { useSubmitScope } from '@hooks/useScope';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import type { Milestone } from '@/types/index';

interface ScopeBuilderProps {
  projectId: string;
  /** Existing milestones from the project (e.g., from a previous scope). */
  existingMilestones?: Milestone[];
  /** Callback when the scope is successfully submitted. */
  onSubmitted?: () => void;
  /** Callback to close/hide the scope builder. */
  onCancel?: () => void;
}

/** Empty milestone template for adding new entries. */
function createEmptyMilestone(): MilestoneFormState {
  return {
    title: '',
    description: '',
    budget: '',
    deliveryTime: '',
    deliveryDate: '',
    role: '',
    proficiency: '',
    skills: [],
    availability: '',
    neededHours: '',
  };
}

/** Local form state for a milestone (all values as strings for form binding). */
interface MilestoneFormState {
  title: string;
  description: string;
  budget: string;
  deliveryTime: string;
  deliveryDate: string;
  role: string;
  proficiency: string;
  skills: string[];
  availability: string;
  neededHours: string;
}

/**
 * Converts existing Milestone data to MilestoneFormState for form binding.
 */
function milestoneToFormState(m: Milestone): MilestoneFormState {
  let deliveryDateStr = '';
  if (m.deliveryDate) {
    const d =
      typeof m.deliveryDate === 'number'
        ? new Date(m.deliveryDate)
        : new Date(m.deliveryDate);
    if (!isNaN(d.getTime())) {
      deliveryDateStr = d.toISOString().slice(0, 16);
    }
  }

  return {
    title: m.title ?? '',
    description: m.description ?? '',
    budget: m.budget !== null && m.budget !== undefined ? String(budgetPlanckToHuman(m.budget)) : '',
    deliveryTime: m.deliveryTime !== undefined && m.deliveryTime !== null ? String(m.deliveryTime) : '',
    deliveryDate: deliveryDateStr,
    role: m.role ?? '',
    proficiency: m.proficiency ?? '',
    skills: m.skills ?? [],
    availability: m.availability ?? '',
    neededHours:
      m.neededHours !== undefined && m.neededHours !== null
        ? String(m.neededHours)
        : '',
  };
}

/**
 * Converts MilestoneFormState back to the Milestone payload for the API.
 */
function formStateToMilestone(form: MilestoneFormState): Milestone {
  return {
    title: form.title,
    description: form.description,
    budget: form.budget ? Number(form.budget) : null,
    deliveryTime: form.deliveryTime || undefined,
    deliveryDate: form.deliveryDate
      ? new Date(form.deliveryDate).valueOf()
      : undefined,
    role: form.role || null,
    proficiency: form.proficiency || null,
    skills:
      form.skills.length > 0
        ? form.skills
        : undefined,
    availability: form.availability || undefined,
    neededHours: form.neededHours ? Number(form.neededHours) : undefined,
  };
}

export function ScopeBuilder({
  projectId,
  existingMilestones,
  onSubmitted,
  onCancel,
}: ScopeBuilderProps) {
  // Initialize milestones from existing data or start empty
  const [milestones, setMilestones] = useState<MilestoneFormState[]>(() => {
    if (existingMilestones && existingMilestones.length > 0) {
      return existingMilestones.map(milestoneToFormState);
    }
    return [createEmptyMilestone()];
  });

  const [consultantComment, setConsultantComment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(
    milestones.length > 0 ? 0 : null
  );

  const { data: enums, isLoading: enumsLoading } = useEnums();
  const submitScope = useSubmitScope();

  // -------------------------------------------------------------------
  // Milestone CRUD
  // -------------------------------------------------------------------

  const addMilestone = useCallback(() => {
    setMilestones((prev) => [...prev, createEmptyMilestone()]);
    setEditingIndex(milestones.length);
  }, [milestones.length]);

  const removeMilestone = useCallback(
    (index: number) => {
      setMilestones((prev) => prev.filter((_, i) => i !== index));
      if (editingIndex === index) {
        setEditingIndex(null);
      } else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
    },
    [editingIndex]
  );

  const updateMilestone = useCallback(
    (index: number, field: keyof MilestoneFormState, value: string | string[]) => {
      setMilestones((prev) =>
        prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
      );
    },
    []
  );

  const toggleSkill = useCallback(
    (index: number, skill: string) => {
      setMilestones((prev) =>
        prev.map((m, i) => {
          if (i !== index) return m;
          const skills = m.skills.includes(skill)
            ? m.skills.filter((s) => s !== skill)
            : [...m.skills, skill];
          return { ...m, skills };
        })
      );
    },
    []
  );

  // -------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    // Validate at least one milestone with a title
    const validMilestones = milestones.filter((m) => m.title.trim());
    if (validMilestones.length === 0) return;

    const payload = validMilestones.map(formStateToMilestone);

    submitScope.mutate(
      {
        projectId,
        milestones: payload,
        consultantComment,
      },
      {
        onSuccess: () => {
          onSubmitted?.();
        },
      }
    );
  }, [milestones, projectId, consultantComment, submitScope, onSubmitted]);

  const hasValidMilestones = milestones.some((m) => m.title.trim());

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#F5F5F5]">
          Scope Builder
        </h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Milestone summary list */}
      <div className="space-y-2">
        {milestones.map((m, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
              editingIndex === index
                ? 'border-[#36D399] bg-[#36D399]/10'
                : 'border-[#3D3D3D] bg-[#1A1A1A] hover:border-[#555]'
            }`}
            onClick={() => setEditingIndex(index)}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#36D399] text-xs font-bold text-[#141414]">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-[#F5F5F5] truncate">
              {m.title || 'Untitled Milestone'}
            </span>
            {m.budget && (
              <span className="text-xs text-[#36D399] font-medium">
                {Number(m.budget).toLocaleString('en-US')} DUSD
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeMilestone(index);
              }}
              className="text-[#9B9B9B] hover:text-red-400 transition-colors"
              title="Remove milestone"
            >
              <i className="ri-delete-bin-line" />
            </button>
          </div>
        ))}
      </div>

      {/* Add milestone button */}
      <Button variant="outline" size="sm" onClick={addMilestone} className="w-full">
        <i className="ri-add-line mr-2" />
        Add Milestone
      </Button>

      {/* Milestone edit form */}
      {editingIndex !== null && milestones[editingIndex] !== undefined && (
        <MilestoneForm
          key={editingIndex}
          index={editingIndex}
          milestone={milestones[editingIndex]}
          enums={enums}
          enumsLoading={enumsLoading}
          onChange={updateMilestone}
          onToggleSkill={toggleSkill}
        />
      )}

      {/* Consultant comment + submit */}
      <Card className="border-[#3D3D3D] bg-[#231F1F]">
        <CardContent className="p-5 space-y-4">
          <Input
            label="Your Commentary"
            value={consultantComment}
            onChange={(e) => setConsultantComment(e.target.value)}
            placeholder="Add a comment about the scope (optional)"
          />

          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitScope.isPending}
            disabled={!hasValidMilestones || submitScope.isPending}
            className="w-full"
          >
            Submit Scope
          </Button>

          {submitScope.error && (
            <p className="text-sm text-red-400">
              {submitScope.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MilestoneForm sub-component
// ---------------------------------------------------------------------------

interface MilestoneFormProps {
  index: number;
  milestone: MilestoneFormState;
  enums:
    | {
        roles: readonly string[];
        skills: readonly string[];
        proficiency: readonly string[];
        deliveryTimes: readonly string[];
        availability: readonly string[];
      }
    | undefined;
  enumsLoading: boolean;
  onChange: (index: number, field: keyof MilestoneFormState, value: string | string[]) => void;
  onToggleSkill: (index: number, skill: string) => void;
}

function MilestoneForm({
  index,
  milestone,
  enums,
  enumsLoading,
  onChange,
  onToggleSkill,
}: MilestoneFormProps) {
  return (
    <Card className="border-[#3D3D3D] bg-[#1A1A1A]">
      <CardContent className="p-5 space-y-4">
        <h4 className="text-sm font-semibold text-[#F5F5F5] border-b border-[#3D3D3D] pb-2">
          Milestone {index + 1} Details
        </h4>

        {/* Title */}
        <Input
          label="Title"
          value={milestone.title}
          onChange={(e) => onChange(index, 'title', e.target.value)}
          placeholder="Milestone title"
          required
        />

        {/* Description */}
        <div className="w-full">
          <Label htmlFor={`desc-${index}`}>Description</Label>
          <textarea
            id={`desc-${index}`}
            value={milestone.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
            placeholder="Describe the milestone deliverables"
            rows={3}
            className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]"
          />
        </div>

        {/* Budget */}
        <Input
          label="Budget (DUSD)"
          type="number"
          step="0.01"
          value={milestone.budget}
          onChange={(e) => onChange(index, 'budget', e.target.value)}
          placeholder="Budget amount"
        />

        {/* Delivery Time */}
        <div className="w-full">
          <Label>Delivery Time</Label>
          {enumsLoading ? (
            <p className="mt-2 text-xs text-[#9B9B9B]">Loading options...</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-3">
              {enums?.deliveryTimes.map((dt, dtIndex) => (
                <label
                  key={dt}
                  className="flex items-center gap-2 text-sm text-[#C0C0C0] cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`deliveryTime-${index}`}
                    value={String(dtIndex)}
                    checked={milestone.deliveryTime === String(dtIndex)}
                    onChange={(e) =>
                      onChange(index, 'deliveryTime', e.target.value)
                    }
                    className="accent-[#36D399]"
                  />
                  {dt}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Date */}
        <Input
          label="Delivery Date"
          type="datetime-local"
          value={milestone.deliveryDate}
          onChange={(e) => onChange(index, 'deliveryDate', e.target.value)}
        />

        {/* Required Professional section */}
        <div className="border-t border-[#3D3D3D] pt-4">
          <h5 className="text-sm font-medium text-[#F5F5F5] mb-3">
            Required Professional
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role */}
            <div className="w-full">
              <Label htmlFor={`role-${index}`}>Role</Label>
              <select
                id={`role-${index}`}
                value={milestone.role}
                onChange={(e) => onChange(index, 'role', e.target.value)}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                {enums?.roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Proficiency */}
            <div className="w-full">
              <Label htmlFor={`proficiency-${index}`}>Proficiency</Label>
              <select
                id={`proficiency-${index}`}
                value={milestone.proficiency}
                onChange={(e) =>
                  onChange(index, 'proficiency', e.target.value)
                }
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                {enums?.proficiency.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability */}
            <div className="w-full">
              <Label htmlFor={`availability-${index}`}>Availability</Label>
              <select
                id={`availability-${index}`}
                value={milestone.availability}
                onChange={(e) =>
                  onChange(index, 'availability', e.target.value)
                }
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                <option value="fulltime">Full Time</option>
                <option value="parttime">Part Time</option>
                <option value="hourly">Hours per Week</option>
              </select>
            </div>

            {/* Hours per week - shown when availability is hourly */}
            {milestone.availability === 'hourly' && (
              <Input
                label="Hours per week"
                type="number"
                min="0"
                value={milestone.neededHours}
                onChange={(e) =>
                  onChange(index, 'neededHours', e.target.value)
                }
              />
            )}
          </div>

          {/* Skills (multi-select via checkboxes) */}
          <div className="mt-4">
            <Label>Skills</Label>
            {enumsLoading ? (
              <p className="mt-2 text-xs text-[#9B9B9B]">
                Loading skills...
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {enums?.skills.map((skill) => {
                  const isSelected = milestone.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => onToggleSkill(index, skill)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-[#36D399] bg-[#36D399]/20 text-[#36D399]'
                          : 'border-[#3D3D3D] bg-[#231F1F] text-[#9B9B9B] hover:border-[#555]'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
