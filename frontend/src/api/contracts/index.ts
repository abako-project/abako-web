/**
 * Contracts API Client
 *
 * Direct communication with the Smart Contracts API on dev.abako.xyz.
 * Handles project and calendar contract operations including deployment,
 * querying, and method calls.
 *
 * @example
 * ```typescript
 * // Health check
 * const health = await healthCheck();
 *
 * // Deploy a new project contract
 * const deployment = await deployProjectV6('My Project', daoAddress);
 *
 * // Query a project method
 * const result = await queryProjectMethod(contractAddress, 'getInfo', {});
 *
 * // Call a project method (write operation)
 * const tx = await callProjectMethod(contractAddress, 'updateStatus', { status: 'active' });
 * ```
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { contractsConfig, API_TIMEOUTS } from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
}

export interface ConstructorInfo {
  name: string;
  version: string;
  description?: string;
}

export interface ConstructorsResponse {
  constructors: ConstructorInfo[];
}

export interface QueryResponse {
  success: boolean;
  data: unknown;
}

export interface CallResponse {
  success: boolean;
  transactionHash?: string;
  data?: unknown;
}

export interface DeployResponse {
  success: boolean;
  contractAddress: string;
  transactionHash: string;
}

export interface CalendarDeployParams {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

/**
 * Enhanced error with additional context for debugging.
 */
export class ContractsApiError extends Error {
  statusCode: number;
  originalError: AxiosError | Error;
  context: string;

  constructor(error: AxiosError | Error, context: string) {
    const axiosError = error as AxiosError;
    const message =
      (axiosError.response?.data as { message?: string })?.message ||
      axiosError.message ||
      'Unknown Contracts API error';

    super(message);
    this.name = 'ContractsApiError';
    this.statusCode = axiosError.response?.status || 500;
    this.originalError = error;
    this.context = context;

    // Preserve the stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContractsApiError);
    }
  }
}

// ---------------------------------------------------------------------------
// Axios Client Configuration
// ---------------------------------------------------------------------------

const contractsClient: AxiosInstance = axios.create({
  baseURL: contractsConfig.baseURL,
  timeout: API_TIMEOUTS.default,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Error Handler
// ---------------------------------------------------------------------------

/**
 * Generic error handler for Contracts API calls.
 * Logs the error with context and throws an enhanced error.
 */
function handleError(error: unknown, context: string): never {
  const axiosError = error as AxiosError;

  console.error(`[Contracts API Error] ${context}:`, {
    message: axiosError.message,
    status: axiosError.response?.status,
    data: axiosError.response?.data,
    url: axiosError.config?.url,
  });

  throw new ContractsApiError(axiosError, context);
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * Health check for the Contracts API
 * @returns Health status information
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  try {
    const response = await contractsClient.get<HealthCheckResponse>(
      contractsConfig.endpoints.health
    );
    return response.data;
  } catch (error) {
    handleError(error, 'contractsAPI.healthCheck');
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Get available project contract constructors
 * @returns List of available project constructors
 */
export async function getProjectConstructors(): Promise<ConstructorsResponse> {
  try {
    const response = await contractsClient.get<ConstructorsResponse>(
      contractsConfig.endpoints.projects.constructors
    );
    return response.data;
  } catch (error) {
    handleError(error, 'getProjectConstructors');
  }
}

/**
 * Query a method on a project contract (read-only)
 * @param contractAddress - The project contract address
 * @param methodName - The method name to query
 * @param params - Query parameters
 * @returns Query result
 */
export async function queryProjectMethod(
  contractAddress: string,
  methodName: string,
  params: Record<string, unknown> = {}
): Promise<QueryResponse> {
  try {
    const response = await contractsClient.get<QueryResponse>(
      contractsConfig.endpoints.projects.query(contractAddress, methodName),
      { params }
    );
    return response.data;
  } catch (error) {
    handleError(error, `queryProjectMethod(${contractAddress}, ${methodName})`);
  }
}

/**
 * Call a method on a project contract (write operation)
 * @param contractAddress - The project contract address
 * @param methodName - The method name to call
 * @param data - Method call data
 * @returns Call result with transaction hash
 */
export async function callProjectMethod(
  contractAddress: string,
  methodName: string,
  data: Record<string, unknown> = {}
): Promise<CallResponse> {
  try {
    const response = await contractsClient.post<CallResponse>(
      contractsConfig.endpoints.projects.call(contractAddress, methodName),
      { data },
      { timeout: API_TIMEOUTS.blockchainWrite }
    );
    return response.data;
  } catch (error) {
    handleError(error, `callProjectMethod(${contractAddress}, ${methodName})`);
  }
}

/**
 * Deploy a new project contract (version 5)
 * @param name - Project name
 * @param daoAddress - DAO contract address
 * @returns Deployment result with contract address
 */
export async function deployProjectV5(
  name: string,
  daoAddress: string
): Promise<DeployResponse> {
  try {
    const response = await contractsClient.post<DeployResponse>(
      contractsConfig.endpoints.projects.deploy.v5,
      { name, dao_address: daoAddress },
      { timeout: API_TIMEOUTS.blockchainWrite }
    );
    return response.data;
  } catch (error) {
    handleError(error, 'deployProjectV5');
  }
}

/**
 * Deploy a new project contract (version 6)
 * @param name - Project name
 * @param daoAddress - DAO contract address
 * @returns Deployment result with contract address
 */
export async function deployProjectV6(
  name: string,
  daoAddress: string
): Promise<DeployResponse> {
  try {
    const response = await contractsClient.post<DeployResponse>(
      contractsConfig.endpoints.projects.deploy.v6,
      { name, dao_address: daoAddress },
      { timeout: API_TIMEOUTS.blockchainWrite }
    );
    return response.data;
  } catch (error) {
    handleError(error, 'deployProjectV6');
  }
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

/**
 * Get available calendar contract constructors
 * @returns List of available calendar constructors
 */
export async function getCalendarConstructors(): Promise<ConstructorsResponse> {
  try {
    const response = await contractsClient.get<ConstructorsResponse>(
      contractsConfig.endpoints.calendar.constructors
    );
    return response.data;
  } catch (error) {
    handleError(error, 'getCalendarConstructors');
  }
}

/**
 * Query a method on the calendar contract (read-only)
 * @param methodName - The method name to query
 * @param params - Query parameters
 * @returns Query result
 */
export async function queryCalendarMethod(
  methodName: string,
  params: Record<string, unknown> = {}
): Promise<QueryResponse> {
  try {
    const response = await contractsClient.get<QueryResponse>(
      contractsConfig.endpoints.calendar.query(methodName),
      { params }
    );
    return response.data;
  } catch (error) {
    handleError(error, `queryCalendarMethod(${methodName})`);
  }
}

/**
 * Call a method on the calendar contract (write operation)
 * @param methodName - The method name to call
 * @param data - Method call data
 * @returns Call result with transaction hash
 */
export async function callCalendarMethod(
  methodName: string,
  data: Record<string, unknown> = {}
): Promise<CallResponse> {
  try {
    const response = await contractsClient.post<CallResponse>(
      contractsConfig.endpoints.calendar.call(methodName),
      data,
      { timeout: API_TIMEOUTS.blockchainWrite }
    );
    return response.data;
  } catch (error) {
    handleError(error, `callCalendarMethod(${methodName})`);
  }
}

/**
 * Deploy a new calendar contract (version 5)
 * @param params - Calendar deployment parameters
 * @returns Deployment result with contract address
 */
export async function deployCalendarV5(
  params: CalendarDeployParams = {}
): Promise<DeployResponse> {
  try {
    const response = await contractsClient.post<DeployResponse>(
      contractsConfig.endpoints.calendar.deploy,
      params,
      { timeout: API_TIMEOUTS.blockchainWrite }
    );
    return response.data;
  } catch (error) {
    handleError(error, 'deployCalendarV5');
  }
}

// ---------------------------------------------------------------------------
// Default Export
// ---------------------------------------------------------------------------

export default {
  healthCheck,
  getProjectConstructors,
  queryProjectMethod,
  callProjectMethod,
  deployProjectV5,
  deployProjectV6,
  getCalendarConstructors,
  queryCalendarMethod,
  callCalendarMethod,
  deployCalendarV5,
};
