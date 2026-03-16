/**
 * Milestone Defaults — Testing Pre-fill Configuration
 *
 * Reads the `milestone-defaults.json` config file and returns typed form-state
 * objects that can be used to pre-populate the ScopeBuilder form during
 * user-testing sessions.
 *
 * EDITING DEFAULTS: Open `milestone-defaults.json` in the same directory and
 * edit the entries in the "milestones" array. The file is self-documented —
 * read the "_instructions" block at the top for field descriptions.
 *
 * HOW IT WORKS IN THE FORM:
 *   - Milestone 1 is pre-filled from milestones[0] in the JSON.
 *   - Milestone 2 is pre-filled from milestones[1] in the JSON.
 *   - Any additional milestones the user adds beyond the defined count start blank.
 *   - If the JSON array is empty, ALL milestones start blank (original behavior).
 */

import rawDefaults from './milestone-defaults.json';

// ---------------------------------------------------------------------------
// Internal JSON schema types
// ---------------------------------------------------------------------------

/**
 * Shape of a single milestone entry inside milestone-defaults.json.
 * All fields are optional so a partial entry still works without crashing.
 */
interface RawMilestoneDefault {
  title?: string;
  description?: string;
  budget?: string;
  deliveryTime?: string;
  deliveryDate?: string;
  role?: string;
  proficiency?: string;
  skills?: string[];
  availability?: string;
  neededHours?: string;
}

/**
 * Shape of a parsed milestone form state, matching MilestoneFormState in
 * ScopeBuilder.tsx. All fields are strings (matching the form binding).
 * Skills is an array of strings.
 */
export interface MilestoneDefaultFormState {
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

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Coerces a raw value to a trimmed string, returning '' for nullish values.
 */
function toStr(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Coerces a raw skills value to a string array.
 * Returns [] for nullish or non-array values.
 */
function toSkillsArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
}

/**
 * Converts a raw JSON milestone entry to a safe MilestoneDefaultFormState.
 * Missing or invalid fields fall back to their empty defaults so the form
 * never receives undefined or null values.
 */
function parseRawDefault(raw: RawMilestoneDefault): MilestoneDefaultFormState {
  return {
    title: toStr(raw.title),
    description: toStr(raw.description),
    budget: toStr(raw.budget),
    deliveryTime: toStr(raw.deliveryTime),
    deliveryDate: toStr(raw.deliveryDate),
    role: toStr(raw.role),
    proficiency: toStr(raw.proficiency),
    skills: toSkillsArray(raw.skills),
    availability: toStr(raw.availability),
    neededHours: toStr(raw.neededHours),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the pre-fill defaults loaded from `milestone-defaults.json`.
 *
 * Each element in the returned array corresponds to one milestone slot.
 * The array may be empty when no defaults are configured, which preserves
 * the original blank-form behavior.
 *
 * This function is intentionally synchronous — the JSON is bundled by Vite
 * at build time so there is no I/O cost at runtime.
 */
export function getMilestoneDefaults(): readonly MilestoneDefaultFormState[] {
  // The JSON module is typed by TypeScript via resolveJsonModule.
  // We access the `milestones` array defensively so an accidentally malformed
  // JSON file does not crash the application at startup.
  const raw = rawDefaults as {
    milestones?: unknown;
    _instructions?: unknown;
  };

  if (!Array.isArray(raw.milestones) || raw.milestones.length === 0) {
    return [];
  }

  return raw.milestones
    .filter((entry): entry is RawMilestoneDefault => {
      return entry !== null && typeof entry === 'object';
    })
    .map(parseRawDefault);
}

/**
 * Returns the pre-fill default for a specific milestone index.
 *
 * Returns `undefined` when no default is configured for that index, which
 * signals the caller to use a blank milestone instead.
 *
 * @param index - Zero-based position in the milestone list.
 */
export function getMilestoneDefault(index: number): MilestoneDefaultFormState | undefined {
  const defaults = getMilestoneDefaults();
  return defaults[index];
}
