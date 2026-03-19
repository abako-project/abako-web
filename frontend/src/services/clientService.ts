import {
  customConnect,
  findClientByEmail as apiFindClientByEmail,
  getClients,
  getClient,
  customRegister,
  createClient as apiCreateClient,
  updateClient as apiUpdateClient,
  getClientAttachment as apiGetClientAttachment,
} from '@/api/adapter';
import type { Client } from '@/types';
import { ERRORS } from '@/constants/messages';

// Types

interface ClientConnectResponse {
  clientId?: string;
  token: string;
  name?: string;
}

// Functions

export const clientConnect = async (email: string): Promise<ClientConnectResponse> => {
  try {
    if (!email) {
      throw new Error(ERRORS.FIELD_REQUIRED('email', 'logging in client'));
    }

    const response = await customConnect({ userId: email });

    if (!response.success) {
      throw new Error(response.error as string);
    }

    const client = await apiFindClientByEmail(email);

    return {
      clientId: client?.id,
      token: response.token as string,
      name: client?.name,
    };
  } catch (error) {
    console.error('[SEDA Client] Error connecting client:', error);
    throw error;
  }
};

export const getClientIndex = async (): Promise<Client[]> => {
  const { clients } = await getClients();

  clients.forEach((client) => {
    cleanClient(client as unknown as Record<string, unknown>);
  });

  return clients;
};

export const getClientById = async (clientId: string): Promise<Client> => {
  const { client } = await getClient(clientId);

  cleanClient(client as unknown as Record<string, unknown>);

  return client;
};

export const cleanClient = (client: Record<string, unknown>): void => {
  delete client._id;
  delete client.__v;
  delete client.imageData;
  delete client.imageMimeType;
  delete client.projects;
  delete client.createdAt;
  delete client.updatedAt;
};

export const createClient = async (
  email: string,
  name: string,
  preparedData: unknown
): Promise<void> => {
  if (!email) {
    throw new Error(ERRORS.FIELD_REQUIRED('email', 'creating client'));
  }

  if (!name) {
    throw new Error(ERRORS.FIELD_REQUIRED('name', 'registering client'));
  }

  if (!preparedData) {
    throw new Error(ERRORS.FIELD_REQUIRED('preparedData', 'registering client'));
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

    // Step 2: Complete client profile with /adapter/v1/clients
    await apiCreateClient(email, name);
  } catch (error) {
    console.error('[SEDA Client] Error creating client:', error);
    throw error;
  }
};

export const updateClient = async (
  clientId: string,
  data: Record<string, unknown>,
  image?: File
): Promise<unknown> => {
  try {
    const response = await apiUpdateClient(clientId, data, image);
    return response;
  } catch (error) {
    console.error('[SEDA Client] Error updating client:', error);
    throw error;
  }
};

export const findClientByEmail = async (email: string): Promise<Client | null> => {
  const result = await apiFindClientByEmail(email);
  return result ?? null;
};

export const getClientAttachment = async (clientId: string): Promise<unknown | null> => {
  try {
    return await apiGetClientAttachment(clientId);
  } catch (error) {
    console.error('[SEDA Client Attachment] Error:', error);
    return null;
  }
};
