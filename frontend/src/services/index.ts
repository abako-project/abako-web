/**
 * Services Barrel Export
 *
 * Single entry point for all service functions.
 * Services encapsulate business logic over raw API calls.
 *
 * Usage:
 *   import { getProject, createProposal, clientConnect } from '@/services';
 */

// ===================================================================
// Project - Consultas, actualizaciones y acciones en proyectos
// ===================================================================

export {
  /** Obtiene los datos completos de un proyecto por su ID. */
  getProject,
  /** Obtiene la lista de proyectos (filtrable por cliente o developer). */
  getProjectsIndex,
  /** Obtiene el ID del cliente asociado a un proyecto. */
  getProjectClientId,
  /** Obtiene el ID del consultor asignado a un proyecto. */
  getProjectConsultantId,
  /** Obtiene la dirección del contrato de un proyecto. */
  getProjectContractAddress,
  /** Rechaza una propuesta de proyecto (acción del coordinador). */
  rejectProposal,
  /** Marca un proyecto como completado con calificaciones. */
  projectCompleted,
  /** Asigna un equipo de desarrolladores a un proyecto. */
  assignProjectTeam,
  /** Obtiene la información del equipo de un proyecto. */
  getProjectTeam,
  /** Obtiene la información del alcance (scope) de un proyecto. */
  getProjectScopeInfo,
  /** Obtiene todas las tareas (milestones) de un proyecto. */
  getProjectAllTasks,
  /** Obtiene una tarea específica de un proyecto. */
  getProjectTask,
  /** Marca una tarea como completada en el contrato. */
  completeProjectTask,
  /** Obtiene el estado de compleción de una tarea. */
  getProjectTaskCompletionStatus,
  /** Actualiza los datos de un proyecto. */
  updateProjectData,
  /** Establece el contrato de calendario para un proyecto. */
  setProjectCalendarContract,
  /** Envía calificaciones del coordinador para el cliente y desarrolladores. */
  submitCoordinatorRatings,
  /** Envía la calificación del desarrollador para el coordinador. */
  submitDeveloperRating,
} from './projectService';

// ===================================================================
// Proposal - Creación y actualización de propuestas
// ===================================================================

export {
  /** Crea un nuevo proyecto a partir de una propuesta. */
  createProposal,
  /** Actualiza una propuesta de proyecto existente. */
  updateProposal,
} from './proposalService';

// ===================================================================
// Client - Gestión de perfiles de clientes
// ===================================================================

export {
  /** Inicia sesión de un cliente vía email. */
  clientConnect,
  /** Obtiene la lista de todos los clientes. */
  getClientIndex,
  /** Obtiene los detalles de un cliente por su ID. */
  getClientById,
  /** Limpia un objeto cliente eliminando campos internos. */
  cleanClient,
  /** Registra un nuevo cliente en el sistema. */
  createClient,
  /** Actualiza la información del perfil de un cliente. */
  updateClient,
  /** Busca un cliente mediante su dirección de email. */
  findClientByEmail,
  /** Obtiene los archivos adjuntos relacionados con un cliente. */
  getClientAttachment,
} from './clientService';

// ===================================================================
// Developer - Gestión de perfiles de desarrolladores
// ===================================================================

export {
  /** Inicia sesión de un desarrollador vía email. */
  developerConnect,
  /** Obtiene la lista de todos los desarrolladores. */
  getDeveloperIndex,
  /** Obtiene los detalles de un desarrollador por su ID. */
  getDeveloperById,
  /** Limpia un objeto desarrollador eliminando campos internos. */
  cleanDeveloper,
  /** Obtiene los desarrolladores asignados a un proyecto específico. */
  getProjectDevelopers,
  /** Registra un nuevo desarrollador en el sistema. */
  createDeveloper,
  /** Actualiza la información del perfil de un desarrollador. */
  updateDeveloper,
  /** Busca un desarrollador mediante su dirección de email. */
  findDeveloperByEmail,
  /** Obtiene los archivos adjuntos relacionados con un desarrollador. */
  getDeveloperAttachment,
} from './developerService';

// ===================================================================
// Milestone - Gestión de hitos y tareas
// ===================================================================

export {
  /** Obtiene todos los hitos (milestones) de un proyecto. */
  getMilestones,
  /** Limpia un objeto hito eliminando campos internos. */
  cleanMilestone,
  /** Obtiene un hito específico por su ID. */
  getMilestone,
  /** Añade un hito a la sesión local de definición de alcance. */
  addMilestoneToScope,
  /** Actualiza la información de un hito existente. */
  updateMilestone,
  /** Intercambia el orden de dos hitos en la sesión de alcance. */
  swapMilestoneOrder,
  /** Elimina un hito del sistema. */
  destroyMilestone,
  /** Envía un hito para revisión del cliente. */
  submitMilestoneForReview,
  /** Acepta la entrega de un hito (acción del cliente). */
  acceptMilestoneSubmission,
  /** Rechaza la entrega de un hito (acción del cliente). */
  rejectMilestoneSubmission,
} from './milestoneService';

// ===================================================================
// Scope - Gestión del alcance del proyecto
// ===================================================================

export {
  /** Envía una propuesta formal de alcance (scope) para un proyecto. */
  submitScope,
  /** Aprueba la propuesta de alcance de un proyecto (acción del cliente). */
  acceptScope,
  /** Rechaza la propuesta de alcance de un proyecto (acción del cliente). */
  rejectScope,
} from './scopeService';

// ===================================================================
// Rating - Gestión de calificaciones
// ===================================================================

export {
  /** Obtiene las calificaciones recibidas por un desarrollador. */
  getDeveloperRatings,
  /** Obtiene las calificaciones recibidas por un cliente. */
  getClientRatings,
  /** Obtiene todas las calificaciones asociadas a un proyecto. */
  getProjectRatings,
} from './ratingService';

// ===================================================================
// Calendar - Gestión de disponibilidad y cronogramas
// ===================================================================

export {
  /** Obtiene todos los trabajadores registrados en el calendario. */
  getRegisteredWorkers,
  /** Obtiene los datos de disponibilidad de todos los trabajadores. */
  getWorkersAvailability,
  /** Resuelve el email de un trabajador a su dirección de blockchain. */
  getWorkerAddress,
  /** Asegura que un trabajador esté registrado en el contrato de calendario. */
  ensureWorkerRegistered,
  /** Despliega un nuevo contrato de calendario para un proyecto. */
  deployCalendarContract,
  /** Registra múltiples trabajadores en el contrato de calendario. */
  registerMultipleWorkers,
  /** Establece la disponibilidad semanal de un trabajador. */
  setWorkerAvailability,
  /** Obtiene las horas de disponibilidad de un trabajador específico. */
  getWorkerAvailabilityHours,
  /** Verifica si un trabajador está disponible para un requerimiento de horas. */
  checkWorkerAvailability,
  /** Obtiene la lista de trabajadores disponibles actualmente. */
  getAvailableWorkersList,
  /** Obtiene los datos completos de disponibilidad de todos los trabajadores. */
  getAllWorkersAvailabilityData,
} from './calendarService';
