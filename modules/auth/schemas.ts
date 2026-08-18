/**
 * Auth form validation schemas using Zod.
 * All validation runs server-side in Server Actions.
 */

import { z } from 'zod'

export const SignupSchema = z
  .object({
    email: z
      .string()
      .email({ message: 'Informe um e-mail válido.' })
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
      .max(72, { message: 'A senha deve ter no máximo 72 caracteres.' }),
    confirmPassword: z.string(),
    acceptedAge: z.literal('on', {
      message: 'Você deve confirmar que tem 18 anos ou mais.',
    }),
    acceptedTerms: z.literal('on', {
      message: 'Você deve aceitar os Termos de Uso e a Política de Privacidade.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Informe um e-mail válido.' }).toLowerCase().trim(),
  password: z.string().min(1, { message: 'Informe sua senha.' }),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Informe um e-mail válido.' }).toLowerCase().trim(),
})

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'A nova senha deve ter pelo menos 8 caracteres.' })
      .max(72, { message: 'A senha deve ter no máximo 72 caracteres.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
