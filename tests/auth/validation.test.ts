/**
 * Tests: Validation — FASE 01
 * Verifies Zod schemas correctly reject invalid inputs.
 */

import { describe, it, expect } from 'vitest'
import { SignupSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@/modules/auth/schemas'

describe('Validation', () => {
  describe('SignupSchema', () => {
    const valid = {
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      acceptedAge: 'on' as const,
      acceptedTerms: 'on' as const,
    }

    it('accepts valid signup data', () => {
      expect(SignupSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = SignupSchema.safeParse({ ...valid, email: 'not-an-email' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined()
      }
    })

    it('rejects password shorter than 8 characters', () => {
      const result = SignupSchema.safeParse({
        ...valid,
        password: 'abc123',
        confirmPassword: 'abc123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toBeDefined()
      }
    })

    it('rejects mismatched passwords', () => {
      const result = SignupSchema.safeParse({
        ...valid,
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined()
      }
    })

    it('rejects missing acceptedAge checkbox', () => {
      const result = SignupSchema.safeParse({ ...valid, acceptedAge: undefined })
      expect(result.success).toBe(false)
    })

    it('rejects missing acceptedTerms checkbox', () => {
      const result = SignupSchema.safeParse({ ...valid, acceptedTerms: undefined })
      expect(result.success).toBe(false)
    })

    it('rejects acceptedAge with wrong value', () => {
      const result = SignupSchema.safeParse({ ...valid, acceptedAge: 'off' })
      expect(result.success).toBe(false)
    })

    it('normalizes email to lowercase', () => {
      const result = SignupSchema.safeParse({ ...valid, email: 'USER@EXAMPLE.COM' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })
  })

  describe('LoginSchema', () => {
    it('accepts valid login data', () => {
      const result = LoginSchema.safeParse({ email: 'user@example.com', password: 'anypassword' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = LoginSchema.safeParse({ email: 'notvalid', password: 'pass' })
      expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
      const result = LoginSchema.safeParse({ email: 'user@example.com', password: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('ForgotPasswordSchema', () => {
    it('accepts valid email', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
    })

    it('rejects invalid email', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false)
    })
  })

  describe('ResetPasswordSchema', () => {
    it('accepts matching passwords', () => {
      const result = ResetPasswordSchema.safeParse({
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      })
      expect(result.success).toBe(true)
    })

    it('rejects mismatched passwords', () => {
      const result = ResetPasswordSchema.safeParse({
        password: 'NewPassword123!',
        confirmPassword: 'Different!',
      })
      expect(result.success).toBe(false)
    })

    it('rejects password shorter than 8 chars', () => {
      const result = ResetPasswordSchema.safeParse({
        password: 'abc',
        confirmPassword: 'abc',
      })
      expect(result.success).toBe(false)
    })
  })
})
