/**
 * DeveloperProfilePage - Developer profile view and edit
 *
 * Show mode matches Figma node 1350:15713:
 *   - Full-width header: avatar (72px), name (30px bold), ID hash, toggle, rating
 *   - Two-column layout: profile card (left) + reviews (right)
 *   - Profile card: role/proficiency, bio, background, skills, info items
 *
 * Edit mode: card-based form (wrapped in its own padded container).
 *
 * Uses React Query hooks for data fetching and mutations.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeveloperProfile, useUpdateDeveloperProfile, useUploadProfileImage } from '@hooks/useProfile';
import { useDeveloperRatings } from '@hooks/useRatings';
import { useEnums } from '@hooks/useEnums';
import { useMembershipNFT } from '@hooks/useMembership';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/Card';
import { Spinner } from '@components/ui/Spinner';
import { ToggleSwitch } from '@components/ui/ToggleSwitch';
import { StarRating } from '@components/features/ratings/StarRating';
import { ReviewsList } from '@components/features/ratings/ReviewsList';
import { MembershipNFTCard } from '@components/features/profile/MembershipNFTCard';
import { InfoItem } from '@components/features/profile/InfoItem';
import type { DeveloperUpdateData, LanguagesMap } from '@/types/index';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeveloperProfilePageProps {
  developerId: string;
  startInEditMode?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeveloperProfilePage({ developerId, startInEditMode }: DeveloperProfilePageProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(startInEditMode ?? false);

  const { data, isLoading, isError, error } = useDeveloperProfile(developerId);
  const { data: ratingsData, isLoading: isLoadingRatings } = useDeveloperRatings(developerId);
  const { data: enums } = useEnums();
  const updateMutation = useUpdateDeveloperProfile();
  const uploadMutation = useUploadProfileImage();

  // Membership NFT: resolve blockchain address from the developer's email.
  // We call this unconditionally (hooks must not be conditional) and pass
  // undefined until the profile data has loaded.
  const { data: membership } = useMembershipNFT(data?.developer?.email);

  // ------- Form state -------
  const [formData, setFormData] = useState<DeveloperUpdateData>({});
  const [isAvailableForHire, setIsAvailableForHire] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when entering edit mode or data changes
  useEffect(() => {
    if (data?.developer && isEditing) {
      const dev = data.developer;
      setFormData({
        name: dev.name || '',
        bio: dev.bio || '',
        background: dev.background || '',
        role: dev.role || null,
        proficiency: dev.proficiency || null,
        githubUsername: dev.githubUsername || '',
        portfolioUrl: dev.portfolioUrl || '',
        location: dev.location || '',
        skills: dev.skills || [],
        languages: dev.languages || [],
        availability: dev.availability || 'NotAvailable',
        availableHoursPerWeek: dev.availableHoursPerWeek || 0,
      });
      setIsAvailableForHire(dev.availability !== 'NotAvailable');
    }
  }, [data?.developer, isEditing]);

  const handleEnterEdit = useCallback(() => {
    setIsEditing(true);
    setSelectedFile(null);
    setImagePreview(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setSelectedFile(null);
    setImagePreview(null);
  }, []);

  const handleFieldChange = useCallback((field: keyof DeveloperUpdateData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSkillToggle = useCallback((skill: string) => {
    setFormData((prev) => {
      const current = prev.skills || [];
      const exists = current.includes(skill);
      return {
        ...prev,
        skills: exists ? current.filter((s) => s !== skill) : [...current, skill],
      };
    });
  }, []);

  const handleLanguageToggle = useCallback((code: string) => {
    setFormData((prev) => {
      const current = prev.languages || [];
      const exists = current.includes(code);
      return {
        ...prev,
        languages: exists ? current.filter((c) => c !== code) : [...current, code],
      };
    });
  }, []);

  const handleAvailabilityToggle = useCallback((checked: boolean) => {
    setIsAvailableForHire(checked);
    if (!checked) {
      setFormData((prev) => ({
        ...prev,
        availability: 'NotAvailable',
        availableHoursPerWeek: 0,
      }));
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSave = useCallback(async () => {
    // Upload image first if selected
    if (selectedFile) {
      await uploadMutation.mutateAsync({
        profileType: 'developer',
        id: developerId,
        file: selectedFile,
      });
    }

    // Build the final data, handling availability mirroring the EJS controller
    const saveData: DeveloperUpdateData = {
      ...formData,
      isAvailableForHire,
    };

    if (!isAvailableForHire) {
      saveData.availability = 'NotAvailable';
      delete saveData.availableHoursPerWeek;
    }

    await updateMutation.mutateAsync({
      id: developerId,
      data: saveData,
    });

    setIsEditing(false);
    setSelectedFile(null);
    setImagePreview(null);
  }, [developerId, formData, isAvailableForHire, selectedFile, updateMutation, uploadMutation]);

  const isSaving = updateMutation.isPending || uploadMutation.isPending;

  // Toggle availability in show mode (must be before early returns to respect hooks rules)
  const handleToggleAvailability = useCallback(
    (checked: boolean) => {
      const dev = data?.developer;
      if (!dev) return;
      updateMutation.mutate({
        id: developerId,
        data: {
          name: dev.name,
          bio: dev.bio,
          background: dev.background,
          role: dev.role,
          proficiency: dev.proficiency,
          githubUsername: dev.githubUsername,
          portfolioUrl: dev.portfolioUrl,
          location: dev.location,
          skills: dev.skills,
          languages: dev.languages,
          availability: checked ? 'FullTime' : 'NotAvailable',
          availableHoursPerWeek: checked ? dev.availableHoursPerWeek : 0,
          isAvailableForHire: checked,
        },
      });
    },
    [developerId, data?.developer, updateMutation]
  );

  // ------- Loading state -------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 px-14">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ------- Error state -------
  if (isError) {
    return (
      <div className="px-14 py-10">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center">
              <i className="ri-error-warning-line text-2xl text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Failed to load profile
            </h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred.'}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { developer, avatarUrl, languageNames } = data;

  // ------- Edit mode -------
  if (isEditing) {
    return (
      <div className="px-14 py-10">
        <div className="max-w-4xl">
          <DeveloperProfileEdit
            formData={formData}
            developerEmail={developer.email}
            avatarUrl={avatarUrl}
            imagePreview={imagePreview}
            isAvailableForHire={isAvailableForHire}
            allRoles={enums?.roles}
            allProficiencies={enums?.proficiency}
            allSkills={enums?.skills}
            allAvailability={enums?.availability}
            languagesMap={enums?.languages}
            fileInputRef={fileInputRef}
            isSaving={isSaving}
            saveError={updateMutation.error?.message || uploadMutation.error?.message || null}
            onFieldChange={handleFieldChange}
            onSkillToggle={handleSkillToggle}
            onLanguageToggle={handleLanguageToggle}
            onAvailabilityToggle={handleAvailabilityToggle}
            onFileChange={handleFileChange}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        </div>
      </div>
    );
  }

  // ------- Show mode (matches Figma node 1350:15713) -------
  const isAvailable = developer.availability !== 'NotAvailable';

  return (
    <div className="flex flex-col gap-10 w-full">
      {/* Profile Header - full width, surface-2 bg, border-bottom */}
      <div className="w-full bg-[var(--base-surface-2,#231f1f)] border-b border-[var(--base-border,#3d3d3d)] px-14 py-8">
        <div className="flex flex-wrap items-end gap-y-6">
          <div className="flex flex-1 items-center min-w-0">
            <div className="flex flex-1 items-center gap-6 pl-4 min-w-0">
              {/* Avatar 72px */}
              <div className="relative shrink-0 w-[72px] h-[72px] rounded-full border border-[var(--base-border,#3d3d3d)] overflow-hidden flex items-center justify-center">
                {/* Fallback icon (always rendered, hidden by image when loaded) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={developer.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>

              {/* Name + ID hash */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-4">
                  <span className="text-[30px] font-bold leading-[42px] text-[var(--text-dark-primary,#f5f5f5)] truncate">
                    {developer.name}
                  </span>
                  <span className="text-xs font-medium leading-[18px] text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))] shrink-0">
                    #{String(developerId).slice(0, 13)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: DAO View button + toggle + rating */}
            <div className="flex items-center gap-8 shrink-0">
              {/* DAO View button */}
              <button
                type="button"
                onClick={() => navigate('/profile/dao')}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[var(--state-brand-active,#36d399)] bg-[rgba(54,211,153,0.08)] text-sm font-semibold leading-[22px] text-[var(--state-brand-active,#36d399)] hover:bg-[rgba(54,211,153,0.15)] transition-colors"
              >
                <i className="ri-government-line text-base leading-none" aria-hidden="true" />
                DAO View
              </button>

              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={isAvailable}
                  onChange={handleToggleAvailability}
                  disabled={updateMutation.isPending}
                />
                <span className="text-sm font-medium leading-[22px] text-[var(--text-dark-primary,#f5f5f5)] whitespace-nowrap">
                  Available for Work
                </span>
              </div>
              <StarRating rating={ratingsData?.averageRating ?? 0} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* Membership NFT Card - only shown when the developer holds a verified membership */}
      {membership?.isMember === true && (
        <div className="px-14">
          <MembershipNFTCard
            membershipId={membership.membershipId}
            joinedAt={membership.joinedAt}
            address={membership.address}
          />
        </div>
      )}

      {/* Content: two columns */}
      <div className="flex gap-14 items-start px-14 pb-8 w-full">
        {/* Left column: Profile card */}
        <div className="flex-1 min-w-0 bg-[var(--base-surface-2,#231f1f)] border border-[var(--base-border,#3d3d3d)] rounded-xl shadow-[0.5px_0.5px_3px_0px_rgba(255,255,255,0.08)] px-8 py-6">
          <div className="flex flex-col gap-6">
            {/* Card header: role + edit button */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-medium leading-7 text-[var(--text-dark-primary,#f5f5f5)]">
                  {developer.role || 'Developer'}
                </span>
                <span className="text-xs font-normal leading-[18px] text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
                  {developer.proficiency || 'No proficiency level'}
                </span>
              </div>
              <button
                onClick={handleEnterEdit}
                className="h-9 px-3 rounded-xl border border-[var(--base-border,#3d3d3d)] bg-[var(--base-surface-2,#231f1f)] text-sm font-semibold leading-[22px] text-[var(--text-dark-primary,#f5f5f5)] hover:bg-[var(--base-fill-1,#333)] transition-colors"
              >
                Edit Information
              </button>
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium leading-[22px] text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
                Bio
              </span>
              <p className="text-sm font-medium leading-[22px] text-[var(--text-dark-primary,#f5f5f5)]">
                {developer.bio || 'No bio available.'}
              </p>
            </div>

            {/* Background */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium leading-[22px] text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
                Background
              </span>
              <p className="text-sm font-medium leading-[22px] text-[var(--text-dark-primary,#f5f5f5)]">
                {developer.background || 'No background information.'}
              </p>
            </div>

            {/* Skills chips */}
            {developer.skills && developer.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {developer.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center h-8 px-3 rounded-full text-sm font-medium leading-[22px] text-[var(--text-dark-primary,#f5f5f5)] bg-[var(--base-surface-2,#231f1f)] border border-[var(--base-border,#3d3d3d)] shadow-[0.5px_0.5px_3px_0px_rgba(255,255,255,0.08)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Info items */}
            <div className="flex flex-col gap-4">
              <InfoItem icon="ri-translate-2" text={languageNames.length > 0 ? languageNames.join(', ') : 'No languages'} />
              <InfoItem icon="ri-map-pin-line" text={developer.location || 'No location'} />
              <InfoItem icon="ri-earth-line" text={developer.portfolioUrl || 'No portfolio URL'} />
              <InfoItem icon="ri-github-line" text={developer.githubUsername || 'No GitHub account'} />
              <InfoItem icon="ri-mail-line" text={developer.email || 'No email'} />
            </div>
          </div>
        </div>

        {/* Right column: Reviews */}
        <ReviewsList
          ratings={ratingsData?.ratings ?? []}
          totalCount={ratingsData?.totalRatings ?? 0}
          isLoading={isLoadingRatings}
          resolveReviewerName={(r) => `Client ${r.clientId}`}
          className="flex-1 min-w-0"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Sub-component
// ---------------------------------------------------------------------------

interface DeveloperProfileEditProps {
  formData: DeveloperUpdateData;
  developerEmail: string;
  avatarUrl: string;
  imagePreview: string | null;
  isAvailableForHire: boolean;
  allRoles: readonly string[] | undefined;
  allProficiencies: readonly string[] | undefined;
  allSkills: readonly string[] | undefined;
  allAvailability: readonly string[] | undefined;
  languagesMap: LanguagesMap | undefined;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isSaving: boolean;
  saveError: string | null;
  onFieldChange: (field: keyof DeveloperUpdateData, value: string | number | null) => void;
  onSkillToggle: (skill: string) => void;
  onLanguageToggle: (code: string) => void;
  onAvailabilityToggle: (checked: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function DeveloperProfileEdit({
  formData,
  developerEmail,
  avatarUrl,
  imagePreview,
  isAvailableForHire,
  allRoles,
  allProficiencies,
  allSkills,
  allAvailability,
  languagesMap,
  fileInputRef,
  isSaving,
  saveError,
  onFieldChange,
  onSkillToggle,
  onLanguageToggle,
  onAvailabilityToggle,
  onFileChange,
  onSave,
  onCancel,
}: DeveloperProfileEditProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Developer Profile</CardTitle>
        <p className="text-sm text-muted-foreground">Developer data</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email (read-only) */}
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Email:</span> {developerEmail}
          </p>
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={(e) => onFieldChange('name', e.target.value)}
            placeholder="Name"
            required
          />
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio || ''}
            onChange={(e) => onFieldChange('bio', e.target.value)}
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Tell us about yourself"
            required
          />
        </div>

        {/* Background */}
        <div>
          <Label htmlFor="background">Background</Label>
          <textarea
            id="background"
            name="background"
            value={formData.background || ''}
            onChange={(e) => onFieldChange('background', e.target.value)}
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Your professional background"
            required
          />
        </div>

        {/* Role */}
        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            value={formData.role || ''}
            onChange={(e) => onFieldChange('role', e.target.value || null)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">None</option>
            {allRoles?.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* Proficiency */}
        <div>
          <Label htmlFor="proficiency">Proficiency</Label>
          <select
            id="proficiency"
            name="proficiency"
            value={formData.proficiency || ''}
            onChange={(e) => onFieldChange('proficiency', e.target.value || null)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">None</option>
            {allProficiencies?.map((prof) => (
              <option key={prof} value={prof}>
                {prof}
              </option>
            ))}
          </select>
        </div>

        {/* GitHub Username */}
        <div>
          <Label htmlFor="githubUsername">GitHub Username</Label>
          <Input
            id="githubUsername"
            name="githubUsername"
            value={formData.githubUsername || ''}
            onChange={(e) => onFieldChange('githubUsername', e.target.value)}
            placeholder="GitHub Username"
            required
          />
        </div>

        {/* Portfolio URL */}
        <div>
          <Label htmlFor="portfolioUrl">Portfolio URL</Label>
          <Input
            id="portfolioUrl"
            name="portfolioUrl"
            value={formData.portfolioUrl || ''}
            onChange={(e) => onFieldChange('portfolioUrl', e.target.value)}
            placeholder="Portfolio URL"
            required
          />
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            value={formData.location || ''}
            onChange={(e) => onFieldChange('location', e.target.value)}
            placeholder="Location"
            required
          />
        </div>

        {/* Skills multi-select */}
        <div>
          <Label>Skills</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allSkills?.map((skill) => {
              const isSelected = (formData.skills || []).includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onSkillToggle(skill)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isSelected
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  {isSelected && <i className="ri-check-line mr-1" />}
                  {skill}
                </button>
              );
            })}
          </div>
        </div>

        {/* Languages multi-select */}
        <div>
          <Label>Languages</Label>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
            {languagesMap ? (
              Object.entries(languagesMap).map(([code, name]) => {
                const isSelected = (formData.languages || []).includes(code);
                return (
                  <label
                    key={code}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary/15 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onLanguageToggle(code)}
                      className="rounded border-input"
                    />
                    <span>{code} - {name}</span>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Loading languages...</p>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-4">
          <Label>Availability</Label>

          {/* Available toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailableForHire}
              onChange={(e) => onAvailabilityToggle(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm text-foreground">
              Show &quot;Available for Work&quot; on profile
            </span>
          </label>

          {/* Work mode selection (shown only when available) */}
          {isAvailableForHire && (
            <div className="space-y-4 pl-7">
              <div>
                <Label htmlFor="availabilityType">Work Mode</Label>
                <select
                  id="availabilityType"
                  name="availability"
                  value={formData.availability || ''}
                  onChange={(e) => onFieldChange('availability', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {allAvailability
                    ?.filter((opt) => opt !== 'NotAvailable')
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </div>

              {/* Hours per week (shown only when WeeklyHours is selected) */}
              {formData.availability === 'WeeklyHours' && (
                <div>
                  <Label htmlFor="availableHoursPerWeek">Hours per week</Label>
                  <Input
                    id="availableHoursPerWeek"
                    name="availableHoursPerWeek"
                    type="number"
                    min="0"
                    value={formData.availableHoursPerWeek?.toString() || '0'}
                    onChange={(e) => onFieldChange('availableHoursPerWeek', parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo upload */}
        <div>
          <Label>Profile Photo (Max size 2MB)</Label>
          <div className="mt-2 flex items-center gap-4">
            <img
              className="w-16 h-16 rounded-full object-cover border-2 border-border bg-muted"
              src={imagePreview || avatarUrl}
              alt="Profile preview"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/none.png';
              }}
            />
            <div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Select file...
              </Button>
              <input
                ref={fileInputRef as React.RefObject<HTMLInputElement>}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {saveError && (
          <div className="rounded-md bg-red-500/15 border border-red-500/30 p-3">
            <p className="text-sm text-red-400">{saveError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={isSaving}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
