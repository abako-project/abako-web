/**
 * Profile Data Hooks
 *
 * React Query hooks for client and developer profiles:
 *   - useClientProfile(id)           -> Fetches client profile
 *   - useUpdateClientProfile()       -> Updates client profile
 *   - useDeveloperProfile(id)        -> Fetches developer profile
 *   - useUpdateDeveloperProfile()    -> Updates developer profile
 *   - useUploadProfileImage()        -> Uploads profile image
 *
 * All hooks use direct service calls (no Express backend).
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { PROFILE_IMAGE_UPLOADED } from '@/constants/messages';
import {
  getClientById,
  updateClient,
  getDeveloperById,
  updateDeveloper,
  ensureWorkerRegistered,
  setWorkerAvailability,
} from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { adapterConfig } from '@/api/config';
import { LANGUAGES } from '@/constants/languages';
import type {
  Client,
  ClientUpdateData,
  Developer,
  DeveloperUpdateData,
} from '@/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const profileKeys = {
  all: ['profiles'] as const,
  clients: () => [...profileKeys.all, 'client'] as const,
  client: (id: string) => [...profileKeys.clients(), id] as const,
  developers: () => [...profileKeys.all, 'developer'] as const,
  developer: (id: string) => [...profileKeys.developers(), id] as const,
};

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Client profile response shape. */
interface ClientProfileResponse {
  client: Client;
  avatarUrl: string;
  languageNames: string[];
}

/** Developer profile response shape. */
interface DeveloperProfileResponse {
  developer: Developer;
  avatarUrl: string;
  languageNames: string[];
}

/** Client update response shape. */
interface UpdateClientResponse {
  client: Client;
  languageNames: string[];
}

/** Developer update response shape. */
interface UpdateDeveloperResponse {
  developer: Developer;
  languageNames: string[];
}

/** Image upload response shape. */
interface UploadImageResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Resolves an array of language codes to their human-readable names.
 * @param languageCodes - Array of ISO 639-3 language codes
 * @returns Array of language names
 */
function resolveLanguageNames(languageCodes: string[] | undefined): string[] {
  if (!languageCodes || languageCodes.length === 0) {
    return [];
  }
  return languageCodes
    .map((code) => LANGUAGES[code] || code)
    .filter(Boolean);
}

/**
 * Builds the avatar URL for a client.
 * @param clientId - The client ID
 * @returns The full URL to the client's avatar
 */
function buildClientAvatarUrl(clientId: string): string {
  return `${adapterConfig.baseURL}${adapterConfig.endpoints.clients.attachment(clientId)}`;
}

/**
 * Builds the avatar URL for a developer.
 * @param developerId - The developer ID
 * @returns The full URL to the developer's avatar
 */
function buildDeveloperAvatarUrl(developerId: string): string {
  return `${adapterConfig.baseURL}${adapterConfig.endpoints.developers.attachment(developerId)}`;
}

// ---------------------------------------------------------------------------
// useClientProfile
// ---------------------------------------------------------------------------

/**
 * Fetches a client profile from the adapter service.
 *
 * Returns the client data, avatar URL, and resolved language names.
 *
 * @param id - The client ID to fetch. When undefined, the query is disabled.
 */
export function useClientProfile(id: string | undefined) {
  return useQuery<ClientProfileResponse>({
    queryKey: profileKeys.client(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Client ID is required');
      }
      const client = await getClientById(id);
      const avatarUrl = buildClientAvatarUrl(id);
      const languageNames = resolveLanguageNames(client.languages);

      return {
        client,
        avatarUrl,
        languageNames,
      };
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ---------------------------------------------------------------------------
// useUpdateClientProfile
// ---------------------------------------------------------------------------

/** Input for the client update mutation: client ID + update data. */
interface UpdateClientInput {
  id: string;
  data: ClientUpdateData;
}

/**
 * Builds the filtered data object for the client adapter API.
 *
 * Mirrors the old Express controller (backend/controllers/client.js)
 * which whitelisted fields and applied defaults before sending to the API.
 */
function buildClientUpdatePayload(
  data: ClientUpdateData
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: data.name || 'name',
    company: data.company || 'company',
    department: data.department || 'department',
    website: data.website || 'website',
    description: data.description || 'description',
    location: data.location || 'location',
  };

  // Languages default to ["none"] if empty
  payload.languages =
    Array.isArray(data.languages) && data.languages.length > 0
      ? data.languages
      : ['none'];

  return payload;
}

/**
 * Mutation for updating a client profile.
 *
 * Fields are whitelisted to only include API-accepted values.
 * On success, invalidates the client profile query.
 */
export function useUpdateClientProfile() {
  const queryClient = useQueryClient();

  return useMutation<UpdateClientResponse, Error, UpdateClientInput>({
    mutationFn: async ({ id, data }: UpdateClientInput) => {
      const payload = buildClientUpdatePayload(data);
      await updateClient(id, payload);

      // Fetch the updated client to return consistent response shape
      const client = await getClientById(id);
      const languageNames = resolveLanguageNames(client.languages);

      return {
        client,
        languageNames,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: profileKeys.client(variables.id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeveloperProfile
// ---------------------------------------------------------------------------

/**
 * Fetches a developer profile from the adapter service.
 *
 * Returns the developer data, avatar URL, and resolved language names.
 *
 * @param id - The developer ID to fetch. When undefined, the query is disabled.
 */
export function useDeveloperProfile(id: string | undefined) {
  return useQuery<DeveloperProfileResponse>({
    queryKey: profileKeys.developer(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Developer ID is required');
      }
      const developer = await getDeveloperById(id);
      const avatarUrl = buildDeveloperAvatarUrl(id);
      const languageNames = resolveLanguageNames(developer.languages);

      return {
        developer,
        avatarUrl,
        languageNames,
      };
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ---------------------------------------------------------------------------
// useUpdateDeveloperProfile
// ---------------------------------------------------------------------------

/** Input for the developer update mutation: developer ID + update data. */
interface UpdateDeveloperInput {
  id: string;
  data: DeveloperUpdateData;
}

/**
 * Builds the filtered data object for the adapter API.
 *
 * Mirrors the old Express controller (backend/controllers/developer.js)
 * which whitelisted fields and applied defaults before sending to the API.
 */
function buildDeveloperUpdatePayload(
  data: DeveloperUpdateData
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: data.name || 'name',
    githubUsername: data.githubUsername || 'githubUsername',
    portfolioUrl: data.portfolioUrl || 'portfolioUrl',
    bio: data.bio || 'bio',
    background: data.background || 'background',
    role: data.role || null,
    location: data.location || 'location',
    proficiency: data.proficiency || null,
  };

  // Skills and languages default to ["none"] if empty.
  // Flatten in case the API returned nested arrays from a previous buggy save.
  payload.skills =
    Array.isArray(data.skills) && data.skills.length > 0
      ? data.skills.flat(Infinity).filter((s): s is string => typeof s === 'string')
      : ['none'];
  payload.languages =
    Array.isArray(data.languages) && data.languages.length > 0
      ? data.languages.flat(Infinity).filter((l): l is string => typeof l === 'string')
      : ['none'];

  // Availability logic matching old backend
  if (!data.isAvailableForHire) {
    payload.availability = 'NotAvailable';
  } else {
    payload.availability = data.availability || 'NotAvailable';
    if (data.availability === 'WeeklyHours') {
      payload.availableHoursPerWeek = parseInt(
        String(data.availableHoursPerWeek || '0')
      );
    }
  }

  return payload;
}

/**
 * Mutation for updating a developer profile.
 *
 * Replicates the old backend controller's 3-step process:
 *   1. ensureWorkerRegistered — register worker in calendar contract
 *   2. setWorkerAvailability — set availability in calendar contract
 *   3. updateDeveloper — update profile via adapter API
 *
 * Fields are whitelisted to only include API-accepted values.
 * On success, invalidates the developer profile query.
 */
export function useUpdateDeveloperProfile() {
  const queryClient = useQueryClient();

  return useMutation<UpdateDeveloperResponse, Error, UpdateDeveloperInput>({
    mutationFn: async ({ id, data }: UpdateDeveloperInput) => {
      const { token, user } = useAuthStore.getState();
      const authToken = token || '';
      const email = user?.email || '';

      // Build filtered payload (whitelist fields, apply defaults)
      const payload = buildDeveloperUpdatePayload(data);

      // Steps 1-2: Calendar contract operations (best-effort).
      // These blockchain write operations may fail due to signing/infra issues.
      // The profile update (step 3) should still proceed.
      try {
        if (email) {
          await ensureWorkerRegistered(email, authToken);
        }
        await setWorkerAvailability(
          payload.availability as string,
          payload.availability === 'WeeklyHours'
            ? (payload.availableHoursPerWeek as number) || 0
            : undefined,
          authToken
        );
      } catch (calendarError) {
        console.warn('[Calendar] Non-blocking error during availability sync:', calendarError);
      }

      // Step 3: Update developer profile via adapter API
      await updateDeveloper(id, payload);

      // Fetch the updated developer to return consistent response shape
      const developer = await getDeveloperById(id);
      const languageNames = resolveLanguageNames(developer.languages);

      return {
        developer,
        languageNames,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: profileKeys.developer(variables.id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useUploadProfileImage
// ---------------------------------------------------------------------------

/** Input for the image upload mutation. */
interface UploadImageInput {
  /** 'client' or 'developer' */
  profileType: 'client' | 'developer';
  /** The profile ID */
  id: string;
  /** The image file to upload */
  file: File;
}

/**
 * Mutation for uploading a profile image.
 *
 * Uploads a profile image using the update service with multipart/form-data.
 * On success, invalidates the relevant profile query.
 */
export function useUploadProfileImage() {
  const queryClient = useQueryClient();

  return useMutation<UploadImageResponse, Error, UploadImageInput>({
    mutationFn: async ({ profileType, id, file }: UploadImageInput) => {
      if (profileType === 'client') {
        // Fetch current client data, filter to API-accepted fields, merge with image
        const client = await getClientById(id);
        const payload = buildClientUpdatePayload(client as unknown as ClientUpdateData);
        await updateClient(id, payload, file);
      } else {
        // Fetch current developer data, filter to API-accepted fields, merge with image
        const developer = await getDeveloperById(id);
        const payload = buildDeveloperUpdatePayload(developer as unknown as DeveloperUpdateData);
        await updateDeveloper(id, payload, file);
      }

      return {
        message: PROFILE_IMAGE_UPLOADED,
      };
    },
    onSuccess: (_data, variables) => {
      if (variables.profileType === 'client') {
        void queryClient.invalidateQueries({
          queryKey: profileKeys.client(variables.id),
        });
      } else {
        void queryClient.invalidateQueries({
          queryKey: profileKeys.developer(variables.id),
        });
      }
    },
  });
}
