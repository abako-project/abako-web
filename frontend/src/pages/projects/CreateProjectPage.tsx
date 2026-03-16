/**
 * CreateProjectPage - Multi-step project proposal wizard
 *
 * Three-step wizard matching Figma designs (161:7305, 161:7232, 161:7266):
 *   Step 1: Project Basics & Summary
 *   Step 2: Define Objectives
 *   Step 3: Review & Submit
 *
 * Uses react-hook-form with zod for per-step validation.
 * Objectives and constraints are managed via local state (dynamic lists).
 * Only the final step (3) submits to the API.
 */

import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEnums } from '@hooks/useEnums';
import { useCreateProject } from '@hooks/useProjects';
import { useAuthStore } from '@/stores/authStore';
import { Label } from '@components/ui/Label';
import { Spinner } from '@components/ui/Spinner';
import { BUDGETS, DELIVERY_TIMES } from '@/types';
import type { EnumsResponse } from '@/types';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';

// ---------------------------------------------------------------------------
// Shared CSS classes
// ---------------------------------------------------------------------------

const INPUT_CLS =
  'flex h-10 w-full rounded-md border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-1,#141414)] px-3 py-2 text-sm text-[var(--text-dark-primary,#f5f5f5)] placeholder:text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-brand-active,#36d399)] disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA_CLS = `${INPUT_CLS} min-h-[120px] resize-y`;

const RADIO_CLS =
  'h-4 w-4 cursor-pointer accent-[var(--state-brand-active,#36d399)] focus:ring-[var(--state-brand-active,#36d399)]';

const BTN_PRIMARY_CLS =
  'flex items-center justify-center gap-2 h-11 px-6 bg-[var(--state-brand-active,#36d399)] rounded-[var(--radi-6,12px)] border border-[rgba(255,255,255,0.12)] hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-[var(--text-light-primary,#141414)]';

const BTN_BACK_CLS =
  'flex items-center gap-2 h-11 px-6 rounded-[var(--radi-6,12px)] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] text-[var(--text-dark-primary,#f5f5f5)] hover:border-[#555] transition-colors text-sm font-medium';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  summary: z
    .string()
    .max(280, 'Summary must be 280 characters or less')
    .optional()
    .default(''),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be 5000 characters or less'),
  url: z.string().optional().default(''),
  projectType: z.coerce.number().min(0, 'Please select a project type'),
  budget: z.coerce.number().min(0, 'Please select a budget range'),
  deliveryTime: z.coerce.number().min(0, 'Please select a delivery time'),
  deliveryDate: z.string().optional().default(''),
});

type FormData = z.infer<typeof createProjectSchema>;

// Fields validated per step
const STEP1_FIELDS: (keyof FormData)[] = [
  'title',
  'summary',
  'description',
  'url',
  'projectType',
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { data: enums, isLoading: enumsLoading } = useEnums();
  const createProject = useCreateProject();
  const user = useAuthStore((s) => s.user);

  const [currentStep, setCurrentStep] = React.useState(1);
  const [objectives, setObjectives] = React.useState<string[]>(['']);
  const [constraints, setConstraints] = React.useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: '',
      summary: '',
      description: '',
      url: '',
      projectType: 0,
      budget: 0,
      deliveryTime: 3,
      deliveryDate: '',
    },
  });

  const summaryValue = watch('summary');
  const summaryLength = summaryValue?.length ?? 0;
  const deliveryTimeValue = Number(watch('deliveryTime'));

  // ---- Step navigation ----

  async function goToStep2() {
    const valid = await trigger(STEP1_FIELDS);
    if (valid) setCurrentStep(2);
  }

  async function goToStep3() {
    const fields: (keyof FormData)[] = ['budget', 'deliveryTime'];
    if (deliveryTimeValue === 3) fields.push('deliveryDate');
    const valid = await trigger(fields);
    if (valid) setCurrentStep(3);
  }

  // ---- Objectives ----

  function addObjective() {
    setObjectives((prev) => [...prev, '']);
  }
  function updateObjective(index: number, value: string) {
    setObjectives((prev) => prev.map((o, i) => (i === index ? value : o)));
  }
  function removeObjective(index: number) {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  }
  function moveObjective(index: number, dir: 'up' | 'down') {
    setObjectives((prev) => {
      const arr = [...prev];
      const t = dir === 'up' ? index - 1 : index + 1;
      if (t < 0 || t >= arr.length) return prev;
      const tmp = arr[index]!;
      arr[index] = arr[t]!;
      arr[t] = tmp;
      return arr;
    });
  }

  // ---- Constraints ----

  function addConstraint() {
    setConstraints((prev) => [...prev, '']);
  }
  function updateConstraint(index: number, value: string) {
    setConstraints((prev) => prev.map((c, i) => (i === index ? value : c)));
  }
  function removeConstraint(index: number) {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
  }

  // ---- Submit (step 3) ----

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createProject.mutateAsync({
        title: data.title,
        summary: data.summary ?? '',
        description: data.description,
        url: data.url ?? '',
        projectType: data.projectType,
        budget: data.budget,
        deliveryTime: data.deliveryTime,
        deliveryDate: data.deliveryDate
          ? new Date(data.deliveryDate).valueOf()
          : '',
      });
      navigate(`/projects/${result.projectId}`);
    } catch {
      // Handled by mutation state
    }
  };

  // ---- Loading ----

  if (enumsLoading) {
    return (
      <div className="px-8 py-10 lg:px-[112px]">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-[rgba(255,255,255,0.7)]">Loading form data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <div className="min-h-screen bg-[var(--base-surface-1,#141414)] px-8 py-10 lg:px-[112px]">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link
          to="/projects"
          className="flex items-center gap-1 text-[rgba(255,255,255,0.7)] transition-colors hover:text-[#f5f5f5]"
        >
          <i className="ri-arrow-left-line text-lg" />
          <span className="text-sm">Back</span>
        </Link>
      </div>

      <div className="flex gap-12">
        {/* Stepper */}
        <div className="hidden flex-shrink-0 lg:block">
          <StepperNumeric currentStep={currentStep} />
        </div>

        {/* Content */}
        <div className="max-w-4xl flex-1">
          {/* Server error */}
          {createProject.isError && (
            <div className="mb-6 rounded-[12px] border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <i className="ri-error-warning-line mt-0.5 text-lg text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Failed to create project
                  </p>
                  <p className="mt-1 text-sm text-red-400/80">
                    {createProject.error?.message || 'An unexpected error occurred.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <Step1
              register={register}
              errors={errors}
              summaryLength={summaryLength}
              enums={enums}
              onNext={goToStep2}
            />
          )}

          {currentStep === 2 && (
            <Step2
              register={register}
              errors={errors}
              enums={enums}
              deliveryTimeValue={deliveryTimeValue}
              objectives={objectives}
              constraints={constraints}
              onAddObjective={addObjective}
              onUpdateObjective={updateObjective}
              onRemoveObjective={removeObjective}
              onMoveObjective={moveObjective}
              onAddConstraint={addConstraint}
              onUpdateConstraint={updateConstraint}
              onRemoveConstraint={removeConstraint}
              onBack={() => setCurrentStep(1)}
              onNext={goToStep3}
            />
          )}

          {currentStep === 3 && (
            <Step3
              values={getValues()}
              objectives={objectives}
              constraints={constraints}
              enums={enums}
              userName={user?.name ?? 'Unknown'}
              isSubmitting={isSubmitting || createProject.isPending}
              onBack={() => setCurrentStep(2)}
              onSubmit={handleSubmit(onSubmit)}
              onEdit={() => setCurrentStep(1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Project Basics & Summary
// ---------------------------------------------------------------------------

interface Step1Props {
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  summaryLength: number;
  enums: EnumsResponse | undefined;
  onNext: () => void;
}

function Step1({ register, errors, summaryLength, enums, onNext }: Step1Props) {
  return (
    <>
      <h1 className="mb-8 text-[30px] font-bold leading-[42px] text-[#f5f5f5]">
        Let&apos;s start with your project description
      </h1>

      <div className="rounded-[12px] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-8 lg:p-11">
        <div className="space-y-6">
          {/* Row 1: Title + Project Type */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="mb-2 block text-[#f5f5f5]">
                  Project Title
                </Label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter your project title"
                  className={INPUT_CLS}
                  {...register('title')}
                />
                {errors.title?.message && (
                  <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
                )}
              </div>

              {/* Short Summary */}
              <div>
                <Label htmlFor="summary" className="mb-2 block text-[#f5f5f5]">
                  Short Summary
                </Label>
                <textarea
                  id="summary"
                  placeholder="Brief summary of your project"
                  className={TEXTAREA_CLS}
                  {...register('summary')}
                />
                <div className="mt-1 flex items-center justify-between">
                  {errors.summary?.message ? (
                    <p className="text-sm text-red-400">{errors.summary.message}</p>
                  ) : (
                    <span className="text-xs text-[rgba(255,255,255,0.5)]">
                      Max. 280 characters
                    </span>
                  )}
                  <span
                    className={`text-xs ${
                      summaryLength > 280
                        ? 'text-red-400'
                        : 'text-[rgba(255,255,255,0.5)]'
                    }`}
                  >
                    {summaryLength}/280
                  </span>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Project Type */}
              <div>
                <Label htmlFor="projectType" className="mb-2 block text-[#f5f5f5]">
                  Project Type
                </Label>
                <select
                  id="projectType"
                  className={INPUT_CLS}
                  {...register('projectType')}
                >
                  <option value="">Audit, MVP, Frontend, Smart Contract, etc.</option>
                  {enums?.projectTypes.map((type, index) => (
                    <option key={type} value={index}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.projectType?.message && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.projectType.message}
                  </p>
                )}
              </div>

              {/* Project Link */}
              <div>
                <Label htmlFor="url" className="mb-2 block text-[#f5f5f5]">
                  Project Link
                </Label>
                <div className="relative">
                  <i className="ri-global-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)]" />
                  <input
                    id="url"
                    type="text"
                    placeholder="www.example.com"
                    className={`${INPUT_CLS} pl-9`}
                    {...register('url')}
                  />
                </div>
                {errors.url?.message && (
                  <p className="mt-1 text-sm text-red-400">{errors.url.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Full-width: Description */}
          <div>
            <Label htmlFor="description" className="mb-2 block text-[#f5f5f5]">
              Project Description
            </Label>
            <textarea
              id="description"
              placeholder="Provide a detailed description of your project requirements"
              className={`${TEXTAREA_CLS} min-h-[180px]`}
              {...register('description')}
            />
            {errors.description?.message && (
              <p className="mt-1 text-sm text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Next button */}
          <div className="flex justify-end pt-4">
            <button type="button" className={BTN_PRIMARY_CLS} onClick={onNext}>
              Next: Define Objectives
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Define Objectives
// ---------------------------------------------------------------------------

interface Step2Props {
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  enums: EnumsResponse | undefined;
  deliveryTimeValue: number;
  objectives: string[];
  constraints: string[];
  onAddObjective: () => void;
  onUpdateObjective: (i: number, v: string) => void;
  onRemoveObjective: (i: number) => void;
  onMoveObjective: (i: number, dir: 'up' | 'down') => void;
  onAddConstraint: () => void;
  onUpdateConstraint: (i: number, v: string) => void;
  onRemoveConstraint: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
}

function Step2({
  register,
  errors,
  enums,
  deliveryTimeValue,
  objectives,
  constraints,
  onAddObjective,
  onUpdateObjective,
  onRemoveObjective,
  onMoveObjective,
  onAddConstraint,
  onUpdateConstraint,
  onRemoveConstraint,
  onBack,
  onNext,
}: Step2Props) {
  return (
    <>
      <h1 className="mb-8 text-[30px] font-bold leading-[42px] text-[#f5f5f5]">
        What do you want to achieve?
      </h1>

      <div className="rounded-[12px] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-8 lg:p-11">
        <div className="space-y-8">
          {/* Key Objectives */}
          <div>
            <div className="mb-2">
              <h2 className="text-base font-semibold text-[#f5f5f5]">
                Key Objectives
              </h2>
            </div>
            <p className="mb-4 text-sm text-[rgba(255,255,255,0.5)]">
              Write these in terms of user value or outcomes. For example:
              &quot;Build a simple front-end to interact with my contract&quot;
            </p>

            {/* Objective rows */}
            <div className="space-y-3">
              {objectives.map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => onUpdateObjective(i, e.target.value)}
                    placeholder="Describe an objective..."
                    className={`${INPUT_CLS} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => onMoveObjective(i, i > 0 ? 'up' : 'down')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[rgba(255,255,255,0.4)] transition-colors hover:text-[#f5f5f5]"
                    title="Reorder"
                  >
                    <i className="ri-expand-up-down-line" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveObjective(i)}
                    disabled={objectives.length <= 1}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[rgba(255,255,255,0.4)] transition-colors hover:text-red-400 disabled:opacity-30"
                    title="Remove"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onAddObjective}
              className="mt-3 text-sm font-medium text-[var(--state-brand-active,#36d399)] hover:underline"
            >
              Add Objective
            </button>
          </div>

          {/* Technical constraints */}
          <div>
            <h2 className="mb-2 text-base font-semibold text-[#f5f5f5]">
              Technical or functional constraints (optional)
            </h2>

            {constraints.length > 0 && (
              <div className="mb-3 space-y-3">
                {constraints.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c}
                      onChange={(e) => onUpdateConstraint(i, e.target.value)}
                      placeholder="Describe a constraint..."
                      className={`${INPUT_CLS} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveConstraint(i)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[rgba(255,255,255,0.4)] transition-colors hover:text-red-400"
                      title="Remove"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onAddConstraint}
              className="text-sm font-medium text-[var(--state-brand-active,#36d399)] hover:underline"
            >
              Add Technical/Functional Constraint
            </button>
          </div>

          {/* Budget + Delivery time (two columns) */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Budget */}
            <div>
              <Label className="mb-3 block text-[#f5f5f5]">
                Total available budget
              </Label>
              <div className="space-y-3">
                {enums?.budgets.map((budget, index) => (
                  <label
                    key={budget}
                    className="group flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="radio"
                      value={index}
                      className={RADIO_CLS}
                      {...register('budget')}
                    />
                    <span className="text-sm text-[#f5f5f5] transition-colors group-hover:text-[var(--state-brand-active,#36d399)]">
                      {budget}
                    </span>
                  </label>
                ))}
              </div>
              {errors.budget?.message && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.budget.message}
                </p>
              )}
            </div>

            {/* Delivery Time */}
            <div>
              <Label className="mb-3 block text-[#f5f5f5]">Delivery time</Label>
              <div className="space-y-3">
                {enums?.deliveryTimes.map((time, index) => (
                  <label
                    key={time}
                    className="group flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="radio"
                      value={index}
                      className={RADIO_CLS}
                      {...register('deliveryTime')}
                    />
                    <span className="text-sm text-[#f5f5f5] transition-colors group-hover:text-[var(--state-brand-active,#36d399)]">
                      {time}
                    </span>

                    {/* Date picker inline when "Specific date" is selected */}
                    {index === 3 && deliveryTimeValue === 3 && (
                      <input
                        type="date"
                        className={`${INPUT_CLS} ml-2 w-44`}
                        {...register('deliveryDate')}
                      />
                    )}
                  </label>
                ))}
              </div>
              {errors.deliveryTime?.message && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.deliveryTime.message}
                </p>
              )}
              {errors.deliveryDate?.message && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.deliveryDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <button type="button" className={BTN_BACK_CLS} onClick={onBack}>
              <i className="ri-arrow-left-line" />
              Back
            </button>
            <button type="button" className={BTN_PRIMARY_CLS} onClick={onNext}>
              Next: Review &amp; Submit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Review & Submit
// ---------------------------------------------------------------------------

interface Step3Props {
  values: FormData;
  objectives: string[];
  constraints: string[];
  enums: EnumsResponse | undefined;
  userName: string;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onEdit: () => void;
}

function Step3({
  values,
  objectives,
  constraints,
  enums,
  userName,
  isSubmitting,
  onBack,
  onSubmit,
  onEdit,
}: Step3Props) {
  const budgetLabel = enums?.budgets[values.budget] ?? BUDGETS[values.budget] ?? '—';
  const deliveryTimeLabel =
    enums?.deliveryTimes[values.deliveryTime] ??
    DELIVERY_TIMES[values.deliveryTime] ??
    '—';

  const deliveryDisplay =
    values.deliveryTime === 3 && values.deliveryDate
      ? `Specific date: ${formatDate(values.deliveryDate)}`
      : deliveryTimeLabel;

  const nonEmptyObjectives = objectives.filter((o) => o.trim() !== '');
  const nonEmptyConstraints = constraints.filter((c) => c.trim() !== '');

  const today = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Initials for avatar
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="mb-2">
        <h1 className="text-[30px] font-bold leading-[42px] text-[#f5f5f5]">
          Ready to share this with our team?
        </h1>
        <p className="mt-1 text-sm text-[rgba(255,255,255,0.7)]">
          Once submitted, your project will be reviewed by our Abako team.
        </p>
      </div>

      {/* Review card */}
      <div className="mt-6 rounded-[12px] border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] p-8 lg:p-11">
        {/* Top section */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-[#f5f5f5]">{values.title}</h2>
            {values.summary && (
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.7)]">
                {values.summary}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#f5f5f5]"
            title="Edit"
          >
            <i className="ri-pencil-line text-lg" />
          </button>
        </div>

        {/* Client info */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--state-brand-active,#36d399)] text-xs font-bold text-[#141414]">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-[#f5f5f5]">{userName}</p>
            <p className="text-xs text-[rgba(255,255,255,0.5)]">{today}</p>
          </div>
        </div>

        {/* Link */}
        {values.url && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[rgba(255,255,255,0.7)]">
            <i className="ri-global-line" />
            <span>{values.url}</span>
          </div>
        )}

        {/* Divider */}
        <hr className="my-6 border-[var(--base-border,#3d3d3d)]" />

        {/* Project Description */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[rgba(255,255,255,0.5)]">
            Project Description
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#f5f5f5]">
            {values.description}
          </p>
        </div>

        {/* Key Objectives */}
        {nonEmptyObjectives.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-[rgba(255,255,255,0.5)]">
              Key Objectives
            </h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-[#f5f5f5]">
              {nonEmptyObjectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Constraints */}
        {nonEmptyConstraints.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-[rgba(255,255,255,0.5)]">
              Technical Constraints
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-[#f5f5f5]">
              {nonEmptyConstraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Budget + Delivery time */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.5)]">
              Total available budget
            </h3>
            <p className="mt-1 text-sm text-[#f5f5f5]">{budgetLabel}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.5)]">
              Delivery time
            </h3>
            <p className="mt-1 text-sm text-[#f5f5f5]">{deliveryDisplay}</p>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between">
        <button type="button" className={BTN_BACK_CLS} onClick={onBack}>
          <i className="ri-arrow-left-line" />
          Back
        </button>
        <button
          type="button"
          className={BTN_PRIMARY_CLS}
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Submitting...
            </>
          ) : (
            'Submit Project'
          )}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// StepperNumeric
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  'Project Basics & Summary',
  'Define Objectives',
  'Review & Submit',
];

interface StepperNumericProps {
  currentStep: number;
}

function StepperNumeric({ currentStep }: StepperNumericProps) {
  return (
    <div className="space-y-8">
      {STEP_LABELS.map((label, index) => {
        const stepNum = index + 1;
        const status =
          stepNum < currentStep
            ? 'completed'
            : stepNum === currentStep
              ? 'active'
              : 'pending';

        return (
          <div key={stepNum} className="flex items-start gap-4">
            <div className="relative">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  status === 'completed'
                    ? 'border-[var(--state-brand-active,#36d399)] bg-[var(--state-brand-active,#36d399)] text-[#141414]'
                    : status === 'active'
                      ? 'border-[var(--state-brand-active,#36d399)] bg-[var(--base-surface-2,#231f1f)] text-[var(--state-brand-active,#36d399)]'
                      : 'border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] text-[rgba(255,255,255,0.7)]'
                }`}
              >
                {status === 'completed' ? (
                  <i className="ri-check-line text-lg" />
                ) : (
                  stepNum
                )}
              </div>

              {/* Connector line */}
              {index < STEP_LABELS.length - 1 && (
                <div
                  className={`absolute left-1/2 top-10 h-8 w-0.5 -translate-x-1/2 ${
                    status === 'completed'
                      ? 'bg-[var(--state-brand-active,#36d399)]'
                      : 'bg-[var(--base-border,#3d3d3d)]'
                  }`}
                />
              )}
            </div>

            <div className="pt-2">
              <p
                className={`text-sm font-medium ${
                  status === 'active'
                    ? 'text-[#f5f5f5]'
                    : 'text-[rgba(255,255,255,0.7)]'
                }`}
              >
                {label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
