import {
  customConnect,
  findDeveloperByEmail as apiFindDeveloperByEmail,
  getDevelopers,
  getDeveloper,
  customRegister,
  createDeveloper as apiCreateDeveloper,
  updateDeveloper as apiUpdateDeveloper,
  getDeveloperAttachment as apiGetDeveloperAttachment,
  getTeam,
} from '@/api/adapter';
import { getUserAddress } from '@/api/virto';
import type { Developer } from '@/types';
import { ERRORS } from '@/constants/messages';

// Types

interface DeveloperConnectResponse {
  developerId?: string;
  token: string;
  name?: string;
}

interface TeamMember {
  account_id: string;
  [key: string]: unknown;
}

// Functions

export const developerConnect = async (email: string): Promise<DeveloperConnectResponse> => {
  try {
    if (!email) {
      throw new Error(ERRORS.FIELD_REQUIRED('email', 'logging in developer'));
    }

    const response = await customConnect({ userId: email });

    if (!response.success) {
      throw new Error(response.error as string);
    }

    const developer = await apiFindDeveloperByEmail(email);

    return {
      developerId: developer?.id,
      token: response.token as string,
      name: developer?.name,
    };
  } catch (error) {
    console.error('[SEDA Developer] Error connecting developer:', error);
    throw error;
  }
};

export const getDeveloperIndex = async (): Promise<Developer[]> => {
  const { developers } = await getDevelopers();

  developers.forEach((developer) => {
    cleanDeveloper(developer as unknown as Record<string, unknown>);
  });

  return developers;
};

export const getDeveloperById = async (developerId: string): Promise<Developer> => {
  const { developer } = await getDeveloper(developerId);

  cleanDeveloper(developer as unknown as Record<string, unknown>);

  return developer;
};

export const cleanDeveloper = (developer: Record<string, unknown>): void => {
  delete developer._id;
  delete developer.__v;
  delete developer.imageData;
  delete developer.imageMimeType;
  delete developer.createdAt;
  delete developer.updatedAt;
};

const getWorkerAddress = async (email: string): Promise<string> => {
  const { address } = await getUserAddress(email);
  return address;
};

export const getProjectDevelopers = async (projectId: string): Promise<Developer[]> => {
  const teamResponse = await getTeam(projectId);
  // The adapter API may return {response: [...]} or {team: [...]}
  // Handle both response shapes
  const teamData = (teamResponse as { response?: TeamMember[]; team?: unknown[] }).response ||
                   (teamResponse as { team: TeamMember[] }).team;
  const team = (teamData as TeamMember[]).map((item) => item.account_id);

  let developers = await getDeveloperIndex();

  for (const developer of developers) {
    const developerWorkerAddress = await getWorkerAddress(developer.email);
    developer.developerWorkerAddress = developerWorkerAddress;
  }

  developers = developers.filter((developer) =>
    team.includes(developer.developerWorkerAddress ?? '')
  );

  return developers;
};

export const createDeveloper = async (
  email: string,
  name: string,
  preparedData: unknown
): Promise<void> => {
  if (!email) {
    throw new Error(ERRORS.FIELD_REQUIRED('email', 'registering developer'));
  }

  if (!name) {
    throw new Error(ERRORS.FIELD_REQUIRED('name', 'registering developer'));
  }

  if (!preparedData) {
    throw new Error(ERRORS.FIELD_REQUIRED('preparedData', 'registering developer'));
  }

  try {
    // Step 1: Create base account with /adapter/v1/custom-register
    const response = await customRegister(preparedData as {
      userId: string;
      name: string;
      email: string;
      [key: string]: unknown;
    });

    if (!response.success) {
      throw new Error(response.error as string);
    }

    // Step 2: Complete developer profile with /adapter/v1/developers
    await apiCreateDeveloper(email, name);
  } catch (error) {
    console.error('[SEDA Developer] Error creating developer:', error);
    throw error;
  }
};

export const updateDeveloper = async (
  developerId: string,
  data: Record<string, unknown>,
  image?: File
): Promise<unknown> => {
  try {
    const updatedDeveloper = await apiUpdateDeveloper(developerId, data, image);
    return updatedDeveloper;
  } catch (error) {
    console.error('[SEDA developerUpdate] Error updating developer:', error);
    throw error;
  }
};

export const findDeveloperByEmail = async (email: string): Promise<Developer | null> => {
  const result = await apiFindDeveloperByEmail(email);
  return result ?? null;
};

export const getDeveloperAttachment = async (developerId: string): Promise<unknown | null> => {
  try {
    return await apiGetDeveloperAttachment(developerId);
  } catch (error) {
    console.error('[SEDA Developer Attachment] Error:', error);
    return null;
  }
};
