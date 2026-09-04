import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRpc, mockFrom, mockRevalidatePath, mockRequireAdmin, mockAdminClient } = vi.hoisted(() => {
  const mockRpc = vi.fn()
  const mockFrom = vi.fn()
  const mockRevalidatePath = vi.fn()
  const mockRequireAdmin = vi.fn()
  const mockAdminClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  }
  return {
    mockRpc,
    mockFrom,
    mockRevalidatePath,
    mockRequireAdmin,
    mockAdminClient,
  }
})

// Mock server-only and next/cache
vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}))

// Mock admin guard
vi.mock("@/modules/moderation/guards", () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

// Mock Supabase clients
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

import {
  adminTransitionProfileStatusAction,
  adminSuspendProfileAction,
  adminReactivateProfileAction,
} from "@/modules/admin/actions"

describe("R12.4C2 Admin Profile Suspend / Reactivate UI & Server Actions", () => {
  const adminActor = { id: "a0000000-0000-0000-0000-000000000001", role: "ADMIN", status: "ACTIVE" }
  const profileId = "33333333-3333-3333-3333-333333333333"

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminActor)
  })

  describe("1. Authorization and Access Control", () => {
    it("denies access if caller is not an ADMIN (rejects CLIENT and ADVERTISER)", async () => {
      mockRequireAdmin.mockRejectedValue(new Error("Forbidden: Admin access required"))

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "TERMS_VIOLATION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INTERNAL_ERROR")
      expect(result.message).toContain("Admin access required")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("denies access when requireAdmin throws unauthorized", async () => {
      mockRequireAdmin.mockRejectedValue(new Error("Unauthorized: Authentication required"))

      const result = await adminReactivateProfileAction({
        profileId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INTERNAL_ERROR")
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("2. Input Validation", () => {
    it("rejects invalid profile UUID format before RPC call", async () => {
      const result = await adminSuspendProfileAction({
        profileId: "not-a-valid-uuid",
        reasonCode: "TERMS_VIOLATION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INVALID_INPUT")
      expect(result.message).toBe("ID de perfil inválido.")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("rejects empty profile ID", async () => {
      const result = await adminSuspendProfileAction({
        profileId: "",
        reasonCode: "TERMS_VIOLATION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INVALID_INPUT")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("rejects SUSPEND without a reason code", async () => {
      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("MISSING_REASON_CODE")
      expect(result.message).toBe("Motivo obrigatório para suspensão.")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("rejects SUSPEND with whitespace-only reason code", async () => {
      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "   ",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("MISSING_REASON_CODE")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("rejects reason code longer than 50 characters", async () => {
      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "A".repeat(51),
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INVALID_INPUT")
      expect(result.message).toContain("50 caracteres")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("rejects notes longer than 1000 characters", async () => {
      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "TERMS_VIOLATION",
        notes: "X".repeat(1001),
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INVALID_INPUT")
      expect(result.message).toContain("1000 caracteres")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("rejects invalid action name", async () => {
      const result = await adminTransitionProfileStatusAction({
        profileId,
        action: "DESTROY" as any,
        reasonCode: "TEST",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INVALID_ACTION")
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("3. Canonical RPC Execution (Atomic Mutation & Immutable Audit)", () => {
    it("executes admin_transition_profile_status RPC for SUSPEND with expected parameters", async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          action: "SUSPEND",
          profile_id: profileId,
          from_status: "ACTIVE",
          to_status: "SUSPENDED",
          event_id: "e0000000-0000-0000-0000-000000000001",
        },
        error: null,
      })

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "SAFETY_CONCERN",
        notes: "Investigação em andamento.",
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe("Perfil suspenso com sucesso.")
      expect(mockRpc).toHaveBeenCalledWith("admin_transition_profile_status", {
        p_profile_id: profileId,
        p_action: "SUSPEND",
        p_reason_code: "SAFETY_CONCERN",
        p_notes: "Investigação em andamento.",
      })

      // Must NEVER update professional_profiles table directly
      expect(mockFrom).not.toHaveBeenCalled()
      expect(mockAdminClient.from).not.toHaveBeenCalled()

      // Must trigger path revalidations
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/profiles/review")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/profiles")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin")
    })

    it("executes admin_transition_profile_status RPC for REACTIVATE with defaults", async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          action: "REACTIVATE",
          profile_id: profileId,
          from_status: "SUSPENDED",
          to_status: "ACTIVE",
          event_id: "e0000000-0000-0000-0000-000000000002",
        },
        error: null,
      })

      const result = await adminReactivateProfileAction({
        profileId,
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe("Perfil reativado com sucesso.")
      expect(mockRpc).toHaveBeenCalledWith("admin_transition_profile_status", {
        p_profile_id: profileId,
        p_action: "REACTIVATE",
        p_reason_code: "ADMIN_REACTIVATION",
        p_notes: null,
      })

      // Must NEVER update table or audit manually
      expect(mockFrom).not.toHaveBeenCalled()
      expect(mockAdminClient.from).not.toHaveBeenCalled()
    })
  })

  describe("4. RPC Error Mapping & Publication Gate Failures", () => {
    it("maps ALREADY_SUSPENDED to friendly message", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "ALREADY_SUSPENDED: Perfil já está suspenso." },
      })

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "FRAUD_SUSPICION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("ALREADY_SUSPENDED")
      expect(result.message).toBe("O perfil já se encontra suspenso.")
    })

    it("maps ALREADY_ACTIVE to friendly message", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "ALREADY_ACTIVE: Perfil já está ativo." },
      })

      const result = await adminReactivateProfileAction({
        profileId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("ALREADY_ACTIVE")
      expect(result.message).toBe("O perfil já se encontra ativo.")
    })

    it("maps INVALID_TRANSITION when attempting to suspend a non-ACTIVE profile (e.g. DRAFT or REJECTED)", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message:
            "INVALID_TRANSITION: Apenas perfis ACTIVE podem ser suspensos (status atual: READY_FOR_REVIEW).",
        },
      })

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "TERMS_VIOLATION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("INVALID_TRANSITION")
      expect(result.message).toBe(
        "Apenas perfis ACTIVE podem ser suspensos (status atual: READY_FOR_REVIEW)."
      )
    })

    it("maps PUBLICATION_GATE_FAILED on reactivation, safely leaving profile SUSPENDED", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message:
            "PUBLICATION_GATE_FAILED: A conta vinculada deve possuir verificação de identidade (KYC) aprovada.",
        },
      })

      const result = await adminReactivateProfileAction({
        profileId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("PUBLICATION_GATE_FAILED")
      expect(result.message).toBe(
        "A conta vinculada deve possuir verificação de identidade (KYC) aprovada."
      )
      // Confirms failure message is clean and without stack trace leaks
      expect(result.message).not.toContain("ERROR:")
      expect(result.message).not.toContain("PL/pgSQL")
    })

    it("maps UNAUTHORIZED / FORBIDDEN database errors properly", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message: "FORBIDDEN: Apenas administradores ativos têm permissão para executar esta operação.",
        },
      })

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "TERMS_VIOLATION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("FORBIDDEN")
      expect(result.message).toBe("Acesso restrito a administradores ativos.")
    })

    it("maps PROFILE_NOT_FOUND error cleanly", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "PROFILE_NOT_FOUND: Perfil não encontrado." },
      })

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "TERMS_VIOLATION",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("NOT_FOUND")
      expect(result.message).toBe("Perfil não encontrado.")
    })
  })

  describe("5. Privacy & Data Protection Invariants", () => {
    it("ensures no sensitive PII (KYC, CPF, legal name, secrets) is returned in the action result", async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          action: "SUSPEND",
          profile_id: profileId,
          from_status: "ACTIVE",
          to_status: "SUSPENDED",
          event_id: "e0000000-0000-0000-0000-000000000001",
        },
        error: null,
      })

      const result = await adminSuspendProfileAction({
        profileId,
        reasonCode: "TERMS_VIOLATION",
      })

      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain("cpf")
      expect(serialized).not.toContain("legal_name")
      expect(serialized).not.toContain("birth_date")
      expect(serialized).not.toContain("biometrics")
      expect(serialized).not.toContain("didit")
      expect(serialized).not.toContain("service_role")
    })
  })
})
