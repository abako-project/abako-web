import { z } from 'zod';

export const clientRegisterSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .email('Ingresa un correo electrónico válido'),
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede superar los 80 caracteres'),
});

export type ClientRegisterFormValues = z.infer<typeof clientRegisterSchema>;
