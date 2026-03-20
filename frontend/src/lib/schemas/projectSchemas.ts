import { z } from 'zod';
import { BUDGETS, DELIVERY_TIMES, PROJECT_TYPES } from '@/types/enums';

export const SPECIFIC_DATE_INDEX = (() => {
  const matchIndex = DELIVERY_TIMES.findIndex((time) =>
    time.toLowerCase().includes('specific'),
  );
  return matchIndex >= 0 ? matchIndex : DELIVERY_TIMES.length - 1;
})();

const numericEnumValidator = (
  optionsLength: number,
  message: string,
) =>
  z
    .coerce.number({ invalid_type_error: message })
    .int({ message })
    .min(0, { message })
    .max(optionsLength - 1, { message });

const optionalUrlSchema = z
  .string()
  .trim()
  .url('Ingresa una URL válida')
  .max(200, 'El enlace no puede superar los 200 caracteres')
  .or(z.literal(''))
  .optional()
  .default('');

const optionalDateSchema = z
  .string()
  .trim()
  .regex(/^(\d{4})-(\d{2})-(\d{2})$/, 'Selecciona una fecha válida (AAAA-MM-DD)')
  .or(z.literal(''))
  .optional()
  .default('');

export const createProjectSchema = z
  .object({
    title: z
      .string({ required_error: 'El título es obligatorio' })
      .trim()
      .min(5, 'El título debe tener al menos 5 caracteres')
      .max(120, 'El título no puede superar los 120 caracteres'),
    summary: z
      .string()
      .trim()
      .max(280, 'El resumen no puede superar los 280 caracteres')
      .optional()
      .default('')
      .refine(
        (value) => value === '' || value.length >= 20,
        'El resumen debe tener al menos 20 caracteres',
      ),
    description: z
      .string({ required_error: 'La descripción es obligatoria' })
      .trim()
      .min(50, 'La descripción debe tener al menos 50 caracteres')
      .max(5000, 'La descripción no puede superar los 5000 caracteres'),
    url: optionalUrlSchema,
    projectType: numericEnumValidator(
      PROJECT_TYPES.length,
      'Debes seleccionar un tipo de proyecto',
    ),
    budget: numericEnumValidator(
      BUDGETS.length,
      'Debes seleccionar un rango de presupuesto',
    ),
    deliveryTime: numericEnumValidator(
      DELIVERY_TIMES.length,
      'Debes seleccionar un tiempo de entrega',
    ),
    deliveryDate: optionalDateSchema,
  })
  .superRefine((data, ctx) => {
    if (data.deliveryTime === SPECIFIC_DATE_INDEX && !data.deliveryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes elegir una fecha específica',
        path: ['deliveryDate'],
      });
    }
  });

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
