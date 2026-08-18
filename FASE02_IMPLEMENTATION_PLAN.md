# FASE 02 — IMPLEMENTATION PLAN
## Identity, Age Verification & KYC Foundation

**Projeto:** AD-Marketplace
**Data:** 2026-08-18
**Status:** AGUARDANDO APROVAÇÃO HUMANA

---

## 1. Estado atual encontrado

### FASE 00 — CLOSED
- Next.js 16.3.1, TypeScript `strict`, React 19
- Supabase clients separados: `lib/supabase/browser.ts`, `server.ts`, `admin.ts`
- `proxy.ts` (substituto do middleware.ts no Next.js 16) — session refresh + redirect coarse
- ESLint (0 warnings max), Vitest, CI GitHub Actions
- Estrutura modular: `/modules/{auth,verification,profiles,media,billing,...}`
- Health endpoint `GET /api/health`
- Commits: `c7d98c8` (foundation), `726695f` (CI)

### FASE 01 — CLOSED & REAL-SUPABASE-VALIDATED
- **`public.account_users`** — migration `20260817000001_account_users.sql`
- Enums: `user_role (ADVERTISER, ADMIN)`, `user_status (ACTIVE, SUSPENDED, DELETED)`, `onboarding_status (NOT_STARTED, IN_PROGRESS, COMPLETED)`
- Trigger `trg_create_account_user_on_signup` — AFTER INSERT on `auth.users` — SECURITY DEFINER + `search_path=public, pg_temp`
- Trigger `prevent_role_status_change` — blocks role/status changes by `authenticated`/`anon`; permite `postgres`/`authenticator`/`supabase_admin`
- RLS: SELECT own (RLS), INSERT bloqueado (`WITH CHECK false`), sem UPDATE policy (silent block), DELETE bloqueado (`USING false`)
- Migration corrective `20260818000001_fix_role_status_trigger.sql`
- Módulos: `modules/auth/{types,schemas,actions,dal,index}.ts`
- DAL: `requireAuth()`, `requireAccount()`, `getSession()`, `getAccount()`
- Server Actions: signup, login, logout, forgot-password, reset-password, startOnboarding
- Rotas: `/signup`, `/login`, `/forgot-password`, `/verify-email`, `/reset-password`, `/dashboard`, `/complete-signup`, `/suspended`, `/auth/callback`
- `lib/config/legal-versions.ts` — `CURRENT_TERMS_VERSION = '1.0'`, `CURRENT_PRIVACY_VERSION = '1.0'`
- 141 testes estáticos + 81 testes de integração real = 222/222 ✅
- CI GitHub Actions: commit `c9c82cf` → success ✅
- `modules/verification/index.ts` — placeholder vazio (`export {}`)

### Migrations aplicadas no Supabase DEV
```
20260817000001_account_users.sql           ← FASE 01
20260818000001_fix_role_status_trigger.sql ← FASE 01 corrective fix
```

### Pontos da FASE 01 reutilizados na FASE 02
- `requireAccount()` — base da cadeia de autorização
- `createAdminClient()` — único cliente que faz writes em tabelas do domínio
- `ActionResult<T>` type — pattern de retorno de Server Actions
- Trigger `set_updated_at` — função já existe no banco, pode ser aplicada em novas tabelas
- Pattern de RLS: sem UPDATE policy para `authenticated` = silent block
- `onboarding_step: number` — FASE 02 avança de step 1 → step 2 → step 3

---

## 2. Documentos consultados

| Arquivo real | Referenciado no prompt como | Lido |
|---|---|---|
| `/docs/00_MASTER_INDEX.md` | — | ✅ |
| `/docs/01_PRODUCT_REQUIREMENTS.md` | — | ✅ |
| `/docs/02_ARCHITECTURE.md` | — | ✅ |
| `/docs/04_IDENTITY_KYC.md` | `03_IDENTITY_KYC.md` | ✅ |
| `/docs/05_PROFILE_DOMAIN.md` | — | ✅ |
| `/docs/07_MEDIA.md` | `06_MEDIA.md` | ✅ |
| `/docs/13_SECURITY_PRIVACY.md` | `13_SECURITY_PRIVACY.md` | ✅ |
| `/docs/14_DATABASE.md` | — | ✅ |
| `/docs/16_ROADMAP.md` | — | ✅ |
| `/docs/12_SEO_GROWTH.md` | `12_SECURITY_LGPD.md` | ⚠️ |

> **Conflito detectado — item 6 do processo:** O prompt referencia `12_SECURITY_LGPD.md` e `03_IDENTITY_KYC.md`. No repositório real, o arquivo 12 é `12_SEO_GROWTH.md` e o KYC está em `04_IDENTITY_KYC.md`. Não existe `12_SECURITY_LGPD.md`. Conteúdo de segurança LGPD está em `13_SECURITY_PRIVACY.md` (uma linha, baseline). O plano foi elaborado com os arquivos reais. Recomendo verificar se há documento LGPD ausente da documentação.

---

## 3. Confirmação da sequência

**`/docs/16_ROADMAP.md` define explicitamente:**
```
FASE 1 — Authentication & Account     — SPEC COMPLETE  ← CLOSED
FASE 2 — Identity & Age Verification  — SPEC COMPLETE  ← PRÓXIMA
FASE 3 — Professional Profile         — SPEC COMPLETE
```

**`/docs/00_MASTER_INDEX.md` confirma:**
- `DEC-006:` No adult media upload before verified identity AND age.
- `DEC-008:` Public identity uses artistic/display name; legal identity remains private.
- `DEC-007:` Didit preferred KYC candidate pending final Terms/DPA/compliance review.

**FASE 02 = Identity + Age Verification + KYC Foundation.**
**Perfil público pertence à FASE 03.** FASE 02 não cria nenhuma página pública, nenhum perfil, nenhum catálogo.

---

## 4. Requisitos extraídos de `/docs/04_IDENTITY_KYC.md`

O arquivo tem 19 linhas. Cada requisito analisado:

| Requisito doc | Tipo | Decisão técnica proposta |
|---|---|---|
| "No adult media upload until `identity_verified=true AND age_verified=true`" | **Invariant absoluto** | Gate `canUploadAdultMedia()` = false se qualquer condição falhar. Implementado como função server-only. |
| "Didit, pending final production review of Terms/AUP, DPA, biometric processing, retention/deletion, residency/subprocessors, Brazilian-document support and final pricing" | Requisito de provider | DiditProvider como adapter. Status: BLOCKED_BY_PROVIDER_CONFIGURATION se sem credentials. MockProvider para desenvolvimento. |
| "Desired checks: document verification, face match, passive liveness, verified DOB/age, CPF validation when justified, and duplicate/fraud controls where appropriate" | Requisito de capability | Configurado via workflow no Didit console. AD-Marketplace recebe resultado normalizado, não executa os checks. "when justified" = CPF não é obrigatório agora. |
| "Prefer that raw documents, KYC selfies and biometric artifacts remain with the KYC provider rather than being duplicated into our infrastructure" | Requisito de arquitetura | **Documentos e biometria ficam no Didit.** AD-Marketplace não recebe, não armazena, não processa. |
| "Suggested internal record: `user_id, provider, provider_reference, status, identity_verified, age_verified, cpf_verified, verified_country, started_at, verified_at, expires_at`" | Requisito de schema | Implementado como schema base. Adicionamos `provider_workflow_id`, `last_webhook_event_id`, `submitted_at`, `result_received_at` para operação e idempotência. |
| "Never expose legal name, CPF, document data, full DOB, residential address, KYC selfie or provider reference publicly" | Requisito de privacy | RLS expõe projeção segura: `status, identity_verified, age_verified, verified_at, expires_at`. Campos de provider só via admin. |

**Lacunas encontradas no documento:**
- Não define quantidade máxima de tentativas de reverificação — proposta: máximo 3 por janela de 30 dias, configurável.
- Não define `expires_at` concreto — proposta: `NULL` inicialmente (Didit define no contrato); campo exists para quando for definido.
- Não define campo `cpf_fingerprint` — decidido: NÃO armazenar CPF nem hash nesta fase (ver item 9).

---

## 5. Fluxo de onboarding proposto

### Mapeamento de steps (continuação do onboarding_step da FASE 01)

```
onboarding_step 0 = Signup não concluído (FASE 01)
onboarding_step 1 = Signup completo, KYC não iniciado  ← entry point da FASE 02
onboarding_step 2 = KYC em andamento / aguardando resultado
onboarding_step 3 = KYC aprovado, aguardando Profile   ← max desta fase
onboarding_status COMPLETED = apenas após FASE 03 (Profile completo)
```

### Fluxo completo

```
[Advertiser autenticado, account ACTIVE, terms_version != NULL]
  → onboarding_step = 1
  → GET /onboarding/verification

  UI: Estado NOT_STARTED
    "Precisamos verificar sua identidade e maioridade."
    [Botão: Iniciar verificação]

  → Clica em "Iniciar verificação"
  → Server Action: startVerificationAction()
    1. requireAccount()               ← FASE 01 barrier
    2. Verificar: nenhuma session PENDING/IN_PROGRESS/VERIFIED ativa
    3. Criar registro identity_verifications (status=NOT_STARTED)
    4. DiditProvider.startVerification({
         workflow_id: DIDIT_WORKFLOW_ID,
         vendor_data: account_user_id,
       })
    5. Didit responde: { session_id, verification_url, session_token }
    6. Persistir: provider_session_id = session_id, status = PENDING, started_at = now()
    7. Atualizar account_users: onboarding_step = 2
    8. Retornar { success: true, verificationUrl }

  → Cliente redireciona usuário para verification_url (Didit hosted flow)

  ┌─────────────────────────────────────────────────┐
  │  Didit hosted UI (fora do AD-Marketplace)       │
  │  - Captura documento (RG/CNH/passaporte)        │
  │  - Selfie + passive liveness                    │
  │  - Face match                                   │
  │  - Verificação de DOB / maioridade              │
  │  - CPF validation (se workflow configurado)     │
  └─────────────────────────────────────────────────┘

  → Usuário conclui ou abandona
  → Didit envia webhook para /api/webhooks/didit
  → Webhook handler valida assinatura HMAC-SHA256
  → Normaliza status:
      "Approved" + age_verified=true  → VERIFIED
      "Approved" + age_verified=false → REJECTED (AGE_REQUIREMENT_NOT_MET)
      "Declined"                      → REJECTED
      "In Review"                     → IN_REVIEW
      "Expired"/"Abandoned"           → EXPIRED

  [Caminho VERIFIED]
    → identity_verifications.status = VERIFIED
    → identity_verified = true, age_verified = true
    → verified_at = now()
    → account_users.onboarding_step = 3

  [Caminho IN_REVIEW]
    → status = IN_REVIEW
    → aguarda segundo webhook com decisão final

  [Caminho REJECTED]
    → status = REJECTED
    → identity_verified/age_verified permanecem false
    → usuário pode tentar novamente (com política de retry)

  → Usuário retorna ao AD-Marketplace
  → GET /onboarding/verification
  → UI exibe estado atual baseado em status
```

### Estados de UI em `/onboarding/verification`

| Status interno | Mensagem principal | CTA |
|---|---|---|
| `NOT_STARTED` | "Verifique sua identidade para continuar." | [Iniciar verificação] |
| `PENDING` | "Sua sessão de verificação está ativa." | [Continuar verificação] |
| `IN_PROGRESS` | "Verificação em andamento..." | Nenhum (aguardar) |
| `IN_REVIEW` | "Sua verificação está em análise. Isso pode levar alguns minutos." | Nenhum |
| `VERIFIED` | "✅ Identidade verificada com sucesso." | [Próxima etapa →] |
| `REJECTED` | "Não foi possível concluir sua verificação." | [Tentar novamente] (se retry permitido) |
| `EXPIRED` | "Sua sessão expirou." | [Iniciar nova verificação] |
| `ERROR` | "Ocorreu um erro técnico. Tente novamente." | [Tentar novamente] |

---

## 6. Schema proposto

### Enum: `public.verification_status`

```sql
CREATE TYPE public.verification_status AS ENUM (
  'NOT_STARTED',   -- Nenhuma session criada no provider
  'PENDING',       -- Session criada, aguardando usuário iniciar o flow
  'IN_PROGRESS',   -- Usuário iniciou mas não concluiu
  'IN_REVIEW',     -- Submission recebida; em análise manual no Didit
  'VERIFIED',      -- Aprovado: identity_verified=true + age_verified=true
  'REJECTED',      -- Rejeitado: identity falhou, age falhou, ou age<18
  'EXPIRED',       -- Session expirou ou abandonada sem conclusão
  'ERROR'          -- Erro técnico na integração (API fail, parse error)
);
```

### Tabela: `public.identity_verifications`

| Coluna | Tipo PostgreSQL | Nullable | Default | Notas |
|--------|----------------|----------|---------|-------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `account_user_id` | `UUID` | NOT NULL | — | FK → `account_users(id)` ON DELETE CASCADE |
| `provider` | `TEXT` | NOT NULL | `'didit'` | Enum-like, extensível |
| `provider_session_id` | `TEXT` | NULL | — | UNIQUE; session_id retornado pelo Didit |
| `provider_workflow_id` | `TEXT` | NULL | — | workflow_id usado na criação |
| `status` | `public.verification_status` | NOT NULL | `'NOT_STARTED'` | Estado interno normalizado |
| `identity_verified` | `BOOLEAN` | NOT NULL | `FALSE` | Escrito APENAS pelo webhook handler |
| `age_verified` | `BOOLEAN` | NOT NULL | `FALSE` | Escrito APENAS pelo webhook handler |
| `cpf_verified` | `BOOLEAN` | NULL | — | NULL = check não realizado |
| `verified_country` | `TEXT` | NULL | — | ISO 3166-1 alpha-2 (ex: 'BR') |
| `last_webhook_event_id` | `TEXT` | NULL | — | Idempotency key — último event_id processado |
| `started_at` | `TIMESTAMPTZ` | NULL | — | Quando session foi criada no Didit |
| `submitted_at` | `TIMESTAMPTZ` | NULL | — | Quando usuário completou o flow |
| `result_received_at` | `TIMESTAMPTZ` | NULL | — | Quando webhook de resultado chegou |
| `verified_at` | `TIMESTAMPTZ` | NULL | — | Quando VERIFIED foi atingido |
| `expires_at` | `TIMESTAMPTZ` | NULL | — | NULL = sem expiração definida ainda |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Trigger set_updated_at |

**Primary Key:** `id`

**Foreign Keys:**
```sql
CONSTRAINT identity_verifications_account_user_id_fkey
  FOREIGN KEY (account_user_id)
  REFERENCES public.account_users(id)
  ON DELETE CASCADE
```

**Unique:**
```sql
CONSTRAINT identity_verifications_provider_session_id_key
  UNIQUE (provider_session_id)
-- NULL values excluídos de UNIQUE — múltiplos NULLs são permitidos
```

**Check constraints:**
```sql
CONSTRAINT identity_verifications_provider_nonempty
  CHECK (provider <> '')

CONSTRAINT identity_verifications_verified_country_format
  CHECK (verified_country IS NULL OR length(verified_country) = 2)

-- age_verified só pode ser TRUE se identity_verified também for TRUE
CONSTRAINT identity_verifications_age_requires_identity
  CHECK (age_verified = FALSE OR identity_verified = TRUE)
```

**Indexes:**
```sql
-- Busca por account (operação mais comum)
CREATE INDEX idx_identity_verifications_account_user_id
  ON public.identity_verifications (account_user_id);

-- Busca por session Didit (webhook handler)
CREATE INDEX idx_identity_verifications_provider_session_id
  ON public.identity_verifications (provider_session_id)
  WHERE provider_session_id IS NOT NULL;

-- Filtro por status (admin queries)
CREATE INDEX idx_identity_verifications_status
  ON public.identity_verifications (status);

-- Partial index: verificações não concluídas (dashboard/monitoring)
CREATE INDEX idx_identity_verifications_active
  ON public.identity_verifications (account_user_id, status)
  WHERE status NOT IN ('VERIFIED', 'REJECTED');
```

---

## 7. Justificativa das tabelas

### Por que uma tabela e não duas ou três

**`identity_verifications` (criada):** necessária e suficiente. O documento `/docs/04_IDENTITY_KYC.md` especifica explicitamente os campos do registro interno. Todos cabem numa tabela sem violação de normalização porque há uma sessão de verificação ativa por vez por usuário.

**`legal_identities` (NÃO criada):** seria prematura. Dados legais — nome real, CPF completo, número de documento, DOB — ficam no Didit. A documentação instrui explicitamente a não duplicar. Não temos dado legal para armazenar nesta fase.

**`verification_events` (NÃO criada):** seria over-engineering. Idempotência é resolvida pelo campo `last_webhook_event_id`. Um audit trail completo pode ser adicionado em FASE 11 (Security & LGPD Hardening) se compliance exigir. Não criar event sourcing sem necessidade documentada.

**`/docs/14_DATABASE.md`** lista `verification_requests` (singular, sem event log) como candidate table — consistente com a decisão de uma tabela.

---

## 8. Classificação de sensibilidade

| Campo | Classificação | Justificativa |
|---|---|---|
| `id` | INTERNAL | UUID aleatório, sem informação de negócio |
| `account_user_id` | INTERNAL | Referência interna; nunca exposta publicamente |
| `provider` | INTERNAL | Nome do provider; não sensível, mas não público |
| `provider_session_id` | **SENSITIVE** | Referência externa ao Didit; nunca em log, URL, ou resposta pública |
| `provider_workflow_id` | INTERNAL | ID de configuração operacional |
| `status` | INTERNAL | Versão normalizada interna — projeção segura ao próprio usuário |
| `identity_verified` | PRIVATE | Resultado binário — somente ao próprio usuário |
| `age_verified` | PRIVATE | Resultado binário — somente ao próprio usuário |
| `cpf_verified` | **PRIVATE** | Confirma que CPF foi checado; nunca pública |
| `verified_country` | INTERNAL | País do documento verificado |
| `last_webhook_event_id` | INTERNAL | Operacional; nunca ao usuário |
| `started_at / submitted_at` | INTERNAL | Timestamps operacionais |
| `result_received_at` | INTERNAL | Operacional |
| `verified_at` | PRIVATE | Data de aprovação — somente ao próprio usuário |
| `expires_at` | PRIVATE | Validade — somente ao próprio usuário |
| **Nome legal** | **SENSITIVE** | Fica no Didit. AD-Marketplace **não armazena**. |
| **CPF completo** | **SENSITIVE** | Fica no Didit. AD-Marketplace **não armazena nesta fase**. |
| **Número do documento** | **SENSITIVE** | Fica no Didit. AD-Marketplace **não armazena**. |
| **DOB completo** | **SENSITIVE** | Fica no Didit. Resultado: `age_verified: boolean` |
| **Selfie / imagem** | **SENSITIVE** | Fica no Didit. AD-Marketplace **nunca recebe**. |
| **Face embeddings** | **SENSITIVE** | Fica no Didit. AD-Marketplace **nunca recebe**. |
| **Provider internal warnings** | **SENSITIVE** | Nunca expostos ao usuário; não logados |

**Projeção RLS segura para o próprio usuário:**
```sql
SELECT status, identity_verified, age_verified, verified_at, expires_at
FROM identity_verifications
WHERE account_user_id = (SELECT id FROM account_users WHERE auth_user_id = auth.uid())
```

---

## 9. Estratégia para CPF

**CPF será coletado pelo AD-Marketplace?** Não diretamente. O usuário informa o CPF dentro do flow Didit (hosted UI). AD-Marketplace não tem formulário que receba CPF.

**CPF será armazenado pelo AD-Marketplace?** **Não**, nesta fase.

**Por quê não armazenar:**
1. `/docs/04_IDENTITY_KYC.md`: "CPF validation when justified" — não é requisito incondicional
2. Didit valida CPF contra Receita Federal/Datavalid/SERPRO internamente
3. `cpf_verified: BOOLEAN` é suficiente para o gate de acesso
4. Reduz superfície LGPD drasticamente: CPF é dado pessoal sensível (Lei 13.709/2018, Art. 11)
5. Sem CPF armazenado = sem necessidade de key management, criptografia, hash
6. Deduplication por CPF: Didit oferece duplicate/fraud controls no próprio workflow

**Precisamos fazer lookup por CPF?** Não, nesta fase. Deduplication é responsabilidade do provider.

**E se compliance exigir no futuro?**
- Nova migration dedicada com aprovação explícita
- Campo `cpf_fingerprint TEXT` = `HMAC(cpf_normalizado, application_secret, 'sha256')` em hex
- Permite deduplication determinística sem reverter o valor
- Chave HMAC em variável de ambiente server-only, rotacionável
- Acesso restrito a admin/service_role; nunca ao cliente; nunca em log

**CPF chegará ao browser depois de persistido?** Nunca. O browser só vê o resultado: `cpf_verified: boolean`.

---

## 10. Estratégia para documentos

**Documentos físicos (RG, CNH, passaporte) → Didit diretamente.**

Arquitetura adotada:
```
Usuário → Didit hosted UI → Didit processa documento
                                    ↓
                          AD-Marketplace recebe:
                          identity_verified: boolean
                          age_verified: boolean
                          (via webhook)
```

**Não há:**
- Upload de documento para nosso storage
- Cópia de imagem de documento em nosso banco
- OCR próprio
- Extração de campos de documento para nosso banco

**Justificativa:** `/docs/04_IDENTITY_KYC.md`: *"Prefer that raw documents, KYC selfies and biometric artifacts remain with the KYC provider rather than being duplicated into our infrastructure"*

Reduz risco LGPD/compliance, elimina necessidade de storage seguro para documentos, scanning de segurança, retenção/purge policy específica.

---

## 11. Estratégia para biometria

**AD-Marketplace não armazenará:**
- Selfie de verificação
- Imagem de face
- Face embeddings / vectors
- Biometric templates
- Liveness check artifacts

**O que o Didit processa (sem chegar ao AD-Marketplace):**
- Captura de selfie
- Passive liveness detection
- Face match (selfie vs. documento)
- Biometric consistency (opcional via SERPRO/Datavalid)

**O que o AD-Marketplace recebe (via webhook result):**
- `identity_verified: boolean` — identity foi confirmada
- `age_verified: boolean` — maioridade foi confirmada
- `status: string` — status Didit para normalização

**Base documental:** `/docs/13_SECURITY_PRIVACY.md` e `/docs/04_IDENTITY_KYC.md`: *"Prefer that raw documents, KYC selfies and biometric artifacts remain with the KYC provider rather than being duplicated into our infrastructure"*.

---

## 12. Provider abstraction

**Arquivo:** `modules/verification/providers/interface.ts`

```typescript
// Tipos de input
interface StartVerificationParams {
  accountUserId: string        // vendor_data para o Didit
  callbackUrl?: string         // URL de retorno após o flow
}

interface ProviderSession {
  providerSessionId: string    // session_id do Didit
  verificationUrl: string      // URL para redirecionar o usuário
  sessionToken: string         // token para SDK mobile, se necessário
}

interface ProviderWebhookEvent {
  eventId: string              // ID único do evento (idempotency)
  sessionId: string            // Correlaciona com provider_session_id
  providerStatus: string       // Status raw do provider (ex: "Approved")
  identityVerified: boolean    // Campo extraído do payload de resultado
  ageVerified: boolean         // Campo extraído do payload de resultado
  cpfVerified: boolean | null  // Null se CPF check não foi feito
  verifiedCountry: string | null
  rawEventType: string         // ex: "status.updated"
}

interface ProviderResult {
  providerStatus: string
  identityVerified: boolean
  ageVerified: boolean
  cpfVerified: boolean | null
}

// Interface do provider
interface VerificationProvider {
  // Cria uma session no provider e retorna dados para redirecionar o usuário
  startVerification(params: StartVerificationParams): Promise<ProviderSession>

  // Busca o resultado de uma session (polling/fallback)
  getVerificationResult(providerSessionId: string): Promise<ProviderResult>

  // Verifica a assinatura de um webhook e extrai o evento normalizado
  parseWebhook(rawBody: Buffer, signatureHeader: string): Promise<ProviderWebhookEvent>

  // Normaliza status do provider para o status interno do domínio
  normalizeStatus(providerStatus: string, ageVerified: boolean): VerificationStatus
}
```

**Responsabilidades do provider:**
- Comunicação HTTP com o provider externo
- Autenticação (API key, tokens)
- Verificação de assinatura de webhook
- Normalização de status para o domínio interno
- Encapsulamento de erros do provider (nunca vazar mensagens para o domínio)

**O domínio (`dal.ts`, `actions.ts`) nunca importa diretamente do adapter Didit** — sempre via interface.

---

## 13. Didit adapter design

**Estrutura de arquivos:**
```
modules/verification/providers/
  interface.ts              ← VerificationProvider interface
  mock/
    index.ts                ← MockVerificationProvider
  didit/
    index.ts                ← DiditProvider implements VerificationProvider
    client.ts               ← HTTP client (fetch wrapper com retry)
    normalizer.ts           ← Didit status string → VerificationStatus
    webhook.ts              ← HMAC-SHA256 signature verification
```

**`DiditProvider` — responsabilidades por arquivo:**

| Arquivo | Responsabilidade |
|---|---|
| `client.ts` | `fetch` para `https://verification.didit.me`; injeta `x-api-key`; trata 4xx/5xx com erros tipados; timeout |
| `normalizer.ts` | Mapeia `"Approved"/"Declined"/...` para `VerificationStatus`; valida `age_verified` antes de retornar VERIFIED |
| `webhook.ts` | Lê `X-Signature-V2`; computa `HMAC-SHA256(rawBody, DIDIT_WEBHOOK_SECRET)`; `timingSafeEqual`; retorna boolean |
| `index.ts` | Implementa `VerificationProvider`; coordena client + normalizer + webhook |

**Autenticação:**
- Header `x-api-key: ${process.env.DIDIT_API_KEY}` em todas as requests
- Variável server-only, nunca prefixada com `NEXT_PUBLIC_`
- OAuth2 (`apx.didit.me/auth/v2/token/`) **não usado** nesta fase — `/v3/session/` usa `x-api-key` diretamente

**Chamadas externas:**
```
POST https://verification.didit.me/v3/session/
  Headers: { 'x-api-key': DIDIT_API_KEY, 'Content-Type': 'application/json' }
  Body:    { workflow_id, vendor_data: account_user_id, callback: callbackUrl }
  Returns: { session_id, verification_url, session_token }

GET  https://verification.didit.me/v3/session/{sessionId}/decision/
  Headers: { 'x-api-key': DIDIT_API_KEY }
  Returns: { status, id_verifications[], liveness_checks[], ... }
```

**Sandbox:** `POST /v3/session/{sessionId}/sandbox/arm` para armar cenários de teste.

**MockVerificationProvider:**
- Implementa `VerificationProvider` com comportamento determinístico
- Cenários: `PENDING`, `IN_REVIEW`, `VERIFIED_ADULT`, `REJECTED_DOCUMENT`, `REJECTED_UNDERAGE`, `EXPIRED`, `ERROR`
- Permite testes completos sem credentials reais

---

## 14. Provider status normalization

| Didit status (string exata) | `age_verified` | Internal `VerificationStatus` | Confiança |
|---|---|---|---|
| `"Not Started"` | — | `NOT_STARTED` | ✅ Confirmado |
| `"Awaiting User"` | — | `PENDING` | ✅ Confirmado |
| `"In Progress"` | — | `IN_PROGRESS` | ✅ Confirmado |
| `"Resubmitted"` | — | `IN_PROGRESS` | ✅ Confirmado |
| `"In Review"` | — | `IN_REVIEW` | ✅ Confirmado |
| `"Approved"` | `true` | `VERIFIED` | ✅ Confirmado |
| `"Approved"` | `false` ou `null` | `REJECTED` (razão: `AGE_REQUIREMENT_NOT_MET`) | ✅ Lógica própria — crítico |
| `"Declined"` | — | `REJECTED` | ✅ Confirmado |
| `"Expired"` | — | `EXPIRED` | ✅ Confirmado |
| `"Kyc Expired"` | — | `EXPIRED` | ✅ Confirmado |
| `"Abandoned"` | — | `EXPIRED` | ✅ Confirmado |
| qualquer desconhecido | — | `ERROR` | Fallback seguro |

> **Regra crítica:** `"Approved"` do Didit **não** mapeia automaticamente para `VERIFIED` no domínio. O normalizer valida explicitamente `age_verified = true` antes de conceder `VERIFIED`. Se `"Approved"` mas `age_verified = false` → `REJECTED`.

**Extração de `age_verified`:** campo retornado em `id_verifications[]` no endpoint `/v3/session/{sessionId}/decision/`. Nome exato do campo — **UNCONFIRMED** (requer teste com sandbox real). Fallback seguro: campo ausente → `age_verified = false` → `REJECTED`.

---

## 15. Verification state machine

### Estados e transições permitidas

```
NOT_STARTED
  → PENDING          trigger: startVerificationAction()

PENDING
  → IN_PROGRESS      trigger: webhook "In Progress"
  → EXPIRED          trigger: webhook "Expired"/"Abandoned"

IN_PROGRESS
  → IN_REVIEW        trigger: webhook "In Review"
  → VERIFIED         trigger: webhook "Approved" + age_verified=true
  → REJECTED         trigger: webhook "Declined" / "Approved" + age<18
  → EXPIRED          trigger: webhook "Expired"/"Abandoned"
  → ERROR            trigger: erro técnico no processamento

IN_REVIEW
  → VERIFIED         trigger: webhook "Approved" + age_verified=true
  → REJECTED         trigger: webhook "Declined"
  → EXPIRED          trigger: webhook "Expired"

VERIFIED
  → EXPIRED          trigger: admin-only (expires_at atingido)

REJECTED
  → PENDING          trigger: nova tentativa (policy de retry)

EXPIRED
  → PENDING          trigger: nova verificação

ERROR
  → PENDING          trigger: retry
```

### Transições explicitamente proibidas

```
VERIFIED → PENDING     (client não pode reverter verificação aprovada)
VERIFIED → REJECTED    (idem)
VERIFIED → NOT_STARTED (idem)
qualquer → VERIFIED    (somente via webhook autenticado ou admin server-side)
```

**Guard function:**
```typescript
function isValidTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  const allowed: Record<VerificationStatus, VerificationStatus[]> = {
    NOT_STARTED: ['PENDING'],
    PENDING:     ['IN_PROGRESS', 'EXPIRED'],
    IN_PROGRESS: ['IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'ERROR'],
    IN_REVIEW:   ['VERIFIED', 'REJECTED', 'EXPIRED'],
    VERIFIED:    ['EXPIRED'],
    REJECTED:    ['PENDING'],
    EXPIRED:     ['PENDING'],
    ERROR:       ['PENDING'],
  }
  return allowed[from]?.includes(to) ?? false
}
```

---

## 16. Age verification logic

**Definição canônica de `canProceed`:**

```typescript
function canProceedToProfessionalProfile(v: IdentityVerification | null): boolean {
  if (v === null) return false                         // sem registro
  if (v.status !== 'VERIFIED') return false           // não aprovado
  if (!v.identity_verified) return false              // identity não confirmada
  if (!v.age_verified) return false                   // age não confirmada
  if (v.expires_at !== null && new Date(v.expires_at) <= new Date()) return false
  return true
}
```

**Cenários explícitos:**

| Cenário | `identity_verified` | `age_verified` | `status` | `canProceed` | Razão |
|---|---|---|---|---|---|
| Usuário com 17 anos | `true` | `false` | `REJECTED` | ❌ `false` | age_verified=false |
| Usuário com 18 anos | `true` | `true` | `VERIFIED` | ✅ `true` | Todos os checks passaram |
| Idade desconhecida | `true` | `false` | `REJECTED` | ❌ `false` | age_verified=false |
| Documento válido, idade não confirmada | `true` | `false` | `REJECTED` | ❌ `false` | age_verified=false |
| Face match falhou | `false` | `false` | `REJECTED` | ❌ `false` | identity_verified=false |
| Verification expirada | `true` | `true` | `EXPIRED` | ❌ `false` | status≠VERIFIED |
| Nenhuma verificação | — | — | N/A | ❌ `false` | v=null |
| Em revisão | `false` | `false` | `IN_REVIEW` | ❌ `false` | status≠VERIFIED |

**Invariant:** `age_verified = true` exige `identity_verified = true` (CHECK constraint no banco + lógica no normalizer).

---

## 17. Webhook architecture

**Rota:** `app/api/webhooks/didit/route.ts`

**Fluxo completo:**

```
POST /api/webhooks/didit
  ↓
1. Ler raw body como Buffer (antes de qualquer parse JSON)
2. Extrair header 'X-Signature-V2'
   Se ausente → HTTP 401
3. verifyDiditWebhook(rawBody, signatureHeader, DIDIT_WEBHOOK_SECRET)
   Se inválido → HTTP 401
4. JSON.parse(rawBody.toString('utf-8'))
   Se parse falhar → HTTP 400
5. Extrair: event_id, webhook_type, session_id, status, vendor_data
6. Verificar idempotência:
   Se last_webhook_event_id = event_id → HTTP 200 imediato
7. Validar webhook_type IN ('status.updated', 'data.updated')
   Se tipo desconhecido → HTTP 200 (acknowledge sem processar)
8. Se status normaliza para VERIFIED:
   GET /v3/session/{session_id}/decision/ → extrair identity_verified, age_verified
9. normalizeStatus(providerStatus, ageVerified) → VerificationStatus
10. isValidTransition(currentStatus, newStatus)
    Se inválida → log sanitizado + HTTP 200
11. UPDATE identity_verifications (via admin client)
12. Se newStatus = VERIFIED: UPDATE account_users.onboarding_step = 3
13. HTTP 200 OK
```

---

## 18. Webhook authentication

**Header:** `X-Signature-V2` (recomendado pelo Didit)
**Algoritmo:** HMAC-SHA256
**Dados assinados:** raw body UTF-8 (antes de qualquer parse JSON)
**Secret:** `DIDIT_WEBHOOK_SECRET` — obtido no Didit Business Console

**Implementação:**
```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

function verifyDiditWebhook(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): boolean {
  const signature = signatureHeader.replace(/^sha256=/, '')
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf-8')
  const receivedBuf = Buffer.from(signature, 'utf-8')
  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
```

**`timingSafeEqual` obrigatório** — previne timing attacks.
**Assinatura inválida:** HTTP 401 imediato, sem processar o body, sem logar o payload.
**UNCONFIRMED:** Formato exato do prefixo (`sha256=<hex>` ou `<hex>` puro) — requer teste com sandbox real. Implementação trata ambos.

**IP Whitelist Didit:** `18.203.201.92` — opcional para dev, recomendado para produção.

---

## 19. Idempotency strategy

**Três níveis de proteção:**

**Nível 1 — event_id:**
```typescript
// Antes de processar:
if (record.last_webhook_event_id === incomingEventId) {
  return HTTP 200 // já processado
}
```

**Nível 2 — state machine guard:**
```typescript
if (!isValidTransition(current.status, newStatus)) {
  // log sanitizado + HTTP 200 — ignora sem erro
  return
}
```

**Nível 3 — UPDATE condicional:**
```sql
UPDATE identity_verifications
SET status = $new_status, ...
WHERE provider_session_id = $session_id
  AND status NOT IN ('VERIFIED')  -- nunca sobrescreve estado final
```

**Retry policy Didit:** até 2 tentativas (1 min + 4 min backoff), timeout 5s.

---

## 20. RLS policies propostas

**Tabela: `public.identity_verifications`**

**POLICY 1 — SELECT (projeção segura ao próprio usuário)**
```sql
CREATE POLICY "identity_verifications__select_own"
  ON public.identity_verifications
  FOR SELECT TO authenticated
  USING (
    account_user_id IN (
      SELECT id FROM public.account_users
      WHERE auth_user_id = auth.uid()
    )
  );
-- Usuário A não lê registro de Usuário B.
-- DAL aplica .select('status, identity_verified, age_verified, verified_at, expires_at')
```

**POLICY 2 — INSERT (bloqueado)**
```sql
CREATE POLICY "identity_verifications__no_client_insert"
  ON public.identity_verifications
  FOR INSERT TO authenticated
  WITH CHECK (false);
-- Toda criação ocorre via admin client (service_role) em Server Actions.
```

**POLICY 3 — DELETE (bloqueado)**
```sql
CREATE POLICY "identity_verifications__no_client_delete"
  ON public.identity_verifications
  FOR DELETE TO authenticated
  USING (false);
```

**UPDATE:** sem policy para `authenticated` → silent block (HTTP 200, `data: []`).
**Anon:** nenhuma policy → bloqueio total.
**service_role:** bypassa RLS — usado no webhook handler e Server Actions.

| Operação | authenticated | anon |
|---|---|---|
| SELECT próprio | ✅ (colunas restritas pela DAL) | ❌ 0 rows |
| SELECT outro | ❌ 0 rows | ❌ 0 rows |
| INSERT | ❌ error 42501 | ❌ |
| UPDATE | ❌ 0 rows (silent) | ❌ |
| DELETE | ❌ error | ❌ |

---

## 21. Server-side authorization

**Cadeia de autorização:**

```typescript
// Nível 1 (FASE 01) — autenticação
requireAuth()
// → sessão Supabase válida | falha: redirect('/login')

// Nível 2 (FASE 01) — conta ativa
requireAccount()
// → auth + account record + terms != NULL + status ACTIVE
// → falha: redirect('/login' | '/complete-signup' | '/suspended')

// Nível 3 (FASE 02) — verificação completa
requireVerifiedAdvertiser()
// → requireAccount() + canProceedToProfessionalProfile(verification)
// → falha: redirect('/onboarding/verification')
// → retorna: { account: AccountUser, verification: IdentityVerification }
```

`requireVerifiedAdvertiser()` é criado nesta fase, consumido por FASE 03+ (Profile, Media).

| Função | Verifica | Usado em |
|---|---|---|
| `requireAuth()` | Sessão Supabase | Qualquer rota autenticada |
| `requireAccount()` | Auth + conta + termos + ACTIVE | Dashboard, onboarding |
| `requireVerifiedAdvertiser()` | Account + KYC + age>=18 | Profile, media (FASE 03+) |

---

## 22. Verified gates

```typescript
// modules/verification/gates.ts — 'server-only'

/** Verificação completa: identity + age + não expirada */
export function canProceedToProfessionalProfile(v: IdentityVerification | null): boolean {
  if (!v) return false
  if (v.status !== 'VERIFIED') return false
  if (!v.identity_verified) return false
  if (!v.age_verified) return false
  if (v.expires_at !== null && new Date(v.expires_at) <= new Date()) return false
  return true
}

export function isIdentityVerified(v: IdentityVerification | null): boolean {
  return v?.identity_verified === true && v?.status === 'VERIFIED'
}

export function isAgeVerified(v: IdentityVerification | null): boolean {
  return v?.age_verified === true && v?.identity_verified === true && v?.status === 'VERIFIED'
}

export function isVerifiedAdult(v: IdentityVerification | null): boolean {
  return isAgeVerified(v)
}
```

---

## 23. Media gate

```typescript
/**
 * Gate para upload de mídia adulta.
 * Invariant DEC-006: NUNCA true sem identity_verified AND age_verified.
 * Nesta fase: implementado, nenhum upload existe.
 * FASE 05 (Media) consumirá esta função.
 */
export function canUploadAdultMedia(v: IdentityVerification | null): boolean {
  return canProceedToProfessionalProfile(v)
}
```

- Antes do KYC: `canUploadAdultMedia(null) === false`
- KYC VERIFIED: `canUploadAdultMedia(v) === true`
- Após expiração: `canUploadAdultMedia(expired) === false`

---

## 24. Profile publication gate

```typescript
/**
 * Gate para publicação de perfil público.
 * Nesta fase: gate existe, Profile não existe.
 * FASE 03 consumirá esta função.
 */
export function canPublishProfile(v: IdentityVerification | null): boolean {
  return canProceedToProfessionalProfile(v)
}
```

---

## 25. Logging / redaction

**Dados que NUNCA aparecem em logs:**

| Dado | Motivo |
|---|---|
| `provider_session_id` completo | Referência sensível |
| `DIDIT_API_KEY` | Credencial de API |
| `DIDIT_WEBHOOK_SECRET` | Credencial de assinatura |
| Payload completo do webhook | Pode conter dados do provider |
| CPF (qualquer forma) | Dado pessoal sensível |
| Nome legal, DOB | Ficam no Didit |
| Stack trace do provider com dados internos | |

**Padrão seguro:**
```typescript
// ✅ BOM
console.info('[webhook:didit] event processed', {
  event_type: event.webhook_type,
  session_partial: event.data?.session_id?.slice(0, 8) + '***',
  new_status: normalizedStatus,
})

// ❌ PROIBIDO
console.log('[webhook:didit] full payload:', JSON.stringify(rawEvent))
```

**Erros ao usuário:** genéricos — ex: `"Não foi possível concluir sua verificação."`. Mensagens internas do Didit nunca chegam ao browser.

---

## 26. Retention

| Categoria | Retemos? | Retenção conceitual | Motivo | LGPD |
|---|---|---|---|---|
| `identity_verifications` row | ✅ | Lifetime da conta | Audit trail, suporte | Requer base legal |
| `provider_session_id` | ✅ | Lifetime | Reference para suporte/dispute | Necessidade operacional |
| `last_webhook_event_id` | ✅ | 30 dias mínimo | Cobre retry window Didit | Operacional |
| `verified_at / expires_at` | ✅ | Lifetime | Prova de aprovação | Compliance |
| Webhook payloads completos | ❌ | Não armazenar | Data minimization | LGPD Art. 6° |
| Documentos (RG/CNH/etc.) | ❌ | Não recebemos | Ficam no Didit | Minimização |
| Selfies / biometria | ❌ | Não recebemos | Ficam no Didit | Minimização |
| CPF (número) | ❌ (nesta fase) | N/A | `cpf_verified: boolean` basta | LGPD Art. 11° |
| Nome legal | ❌ | N/A | Fica no Didit | Minimização |

**Exclusão de conta:** `auth.users` DELETE CASCADE → `account_users` → `identity_verifications` ON DELETE CASCADE. Política de retenção mínima para compliance regulatório requer revisão jurídica antes de produção.

---

## 27. UI / Routes propostas

**Rotas novas:**

```
/onboarding/verification
  → app/(dashboard)/onboarding/verification/page.tsx
  → Protegida: proxy.ts adiciona /onboarding à PROTECTED_ROUTES
  → requireAccount() no Server Component

/api/webhooks/didit
  → app/api/webhooks/didit/route.ts
  → POST only, sem autenticação Supabase
  → Autenticado por HMAC-SHA256
  → Excluído do proxy.ts matcher
```

**Estados da página `/onboarding/verification`:**

```
NOT_STARTED → "Verificar identidade" + [Iniciar verificação]
PENDING     → "Sessão ativa" + [Continuar verificação → URL Didit]
IN_PROGRESS → "Verificação em andamento..." (spinner)
IN_REVIEW   → "Em análise. Aguarde."
VERIFIED    → "✅ Identidade verificada" + [Próxima etapa →]
REJECTED    → "Não foi possível concluir." + [Tentar novamente] ou [Contato suporte]
EXPIRED     → "Sessão expirada." + [Iniciar nova verificação]
ERROR       → "Erro técnico." + [Tentar novamente]
```

---

## 28. Migrations propostas

**Uma migration nesta fase:**

```
supabase/migrations/20260818000002_identity_verifications.sql
```

**Conteúdo (não criar ainda):**
1. `CREATE TYPE public.verification_status AS ENUM (...)` — 7 estados
2. `CREATE TABLE public.identity_verifications (...)` — schema completo do item 6
3. 4 indexes (item 6)
4. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
5. 3 RLS policies (item 20)
6. `CREATE TRIGGER set_updated_at` — reutilizando função já existente no banco (FASE 01)
7. Comentários de segurança e classificação de dados

---

## 29. Arquivos a criar

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/20260818000002_identity_verifications.sql` | Schema completo |
| `modules/verification/types.ts` | `VerificationStatus`, `IdentityVerification`, `VerificationSafeView` |
| `modules/verification/schemas.ts` | Zod: `StartVerificationSchema` |
| `modules/verification/dal.ts` | `getVerification()`, `getVerificationSafe()`, `requireVerifiedAdvertiser()` |
| `modules/verification/actions.ts` | `startVerificationAction()` Server Action |
| `modules/verification/gates.ts` | `canProceedToProfessionalProfile()`, `canUploadAdultMedia()`, `canPublishProfile()` |
| `modules/verification/state-machine.ts` | `isValidTransition()`, `ALLOWED_TRANSITIONS` |
| `modules/verification/providers/interface.ts` | `VerificationProvider` interface + I/O types |
| `modules/verification/providers/mock/index.ts` | `MockVerificationProvider` — cenários determinísticos |
| `modules/verification/providers/didit/index.ts` | `DiditProvider implements VerificationProvider` |
| `modules/verification/providers/didit/client.ts` | HTTP client (fetch + x-api-key) |
| `modules/verification/providers/didit/normalizer.ts` | Didit status → `VerificationStatus` |
| `modules/verification/providers/didit/webhook.ts` | `verifyDiditWebhook()` HMAC + timingSafeEqual |
| `app/(dashboard)/onboarding/verification/page.tsx` | Página de verificação (Server Component) |
| `components/verification/verification-status-card.tsx` | Componente de status por estado |
| `app/api/webhooks/didit/route.ts` | Route Handler POST |
| `tests/verification/authorization.test.ts` | RLS, isolamento User A/B |
| `tests/verification/state-machine.test.ts` | Transições válidas e inválidas |
| `tests/verification/age-verification.test.ts` | Cenários de maioridade |
| `tests/verification/webhook.test.ts` | HMAC, idempotência, status normalization |
| `tests/verification/gates.test.ts` | canPublishProfile, canUploadAdultMedia |
| `tests/verification/security.test.ts` | API key não em bundle, campos privados não expostos |

---

## 30. Arquivos a modificar

| Arquivo | Mudança | Motivo |
|---|---|---|
| `modules/verification/index.ts` | Substituir `export {}` pelas exportações do módulo | Módulo funcional |
| `proxy.ts` | Adicionar `/onboarding` à `PROTECTED_ROUTES` | Proteção de rota |
| `app/(dashboard)/dashboard/page.tsx` | Card de status KYC + CTA para `/onboarding/verification` | UX onboarding progressivo |
| `.env.example` | Adicionar `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_ID`, `DIDIT_API_BASE_URL` | Documentação de env vars |

---

## 31. Dependências novas

**Nenhum pacote npm novo será instalado.**

- `node:crypto` — built-in Node.js — cobre HMAC-SHA256
- `fetch` — nativo no Next.js 16 / Node.js 18+
- `didit-node-client` (community) — **não usado**: não oficial, não auditado
- `@didit-protocol/sdk-web` (frontend) — **não usado**: flow Didit é hosted (redirect), sem embed
- `zod` — já presente (FASE 01)
- `@supabase/supabase-js`, `@supabase/ssr` — já presentes

---

## 32. Test strategy

**Autorização e RLS:**
- `anon` não consegue SELECT em `identity_verifications`
- User A não lê registro de User B
- User A não consegue INSERT (error 42501)
- User A não consegue UPDATE (`data: []`, zero rows)
- User A não consegue DELETE (error 42501)
- Client não pode setar `status = 'VERIFIED'` diretamente
- Client não pode setar `identity_verified = true` diretamente

**Age verification:**
- `canProceed(null)` → false
- `canProceed({ status: VERIFIED, identity_verified: true, age_verified: false })` → false
- `canProceed({ status: VERIFIED, identity_verified: true, age_verified: true, expires_at: null })` → true
- `canProceed({ status: VERIFIED, ..., expires_at: passado })` → false
- `canProceed({ status: REJECTED })` → false
- `canProceed({ status: IN_REVIEW })` → false
- Normalizer: `"Approved"` + `ageVerified=false` → `REJECTED`
- Normalizer: `"Approved"` + `ageVerified=true` → `VERIFIED`

**State machine:**
- Todas as transições válidas retornam `true`
- `VERIFIED → PENDING` → `false`
- `NOT_STARTED → VERIFIED` → `false`
- `IN_REVIEW → PENDING` → `false`
- Webhook com transição inválida → 200 sem corromper estado

**Webhook:**
- Assinatura HMAC válida → processado
- Assinatura inválida → 401, sem processar
- Assinatura ausente → 401
- Evento duplicado (mesmo event_id) → 200 sem reprocessar (idempotente)
- `"Approved"` + `age_verified=false` → REJECTED
- `"Approved"` + `age_verified=true` → VERIFIED
- `"Declined"` → REJECTED
- session_id desconhecido → 200 (acknowledge)

**Privilege escalation:**
- Client body com `status=VERIFIED` → bloqueado por RLS
- Client body com `identity_verified=true` → bloqueado por RLS

**Gates:**
- `canPublishProfile(null)` → false
- `canPublishProfile(REJECTED)` → false
- `canPublishProfile(EXPIRED)` → false
- `canPublishProfile(VERIFIED + age_verified=true)` → true
- `canUploadAdultMedia` — mesma bateria
- `requireVerifiedAdvertiser()` com VERIFIED → retorna `{ account, verification }`
- `requireVerifiedAdvertiser()` com PENDING → redirect `/onboarding/verification`

**Security:**
- `DIDIT_API_KEY` não presente no client bundle
- `DIDIT_WEBHOOK_SECRET` não em nenhum export público
- `provider_session_id` não retornado pela DAL pública
- Erros do Didit não chegam ao response do usuário
- Logs não contêm dados sensíveis

---

## 33. Supabase DEV validation strategy

Após aprovação e implementação:

```
1. npx supabase db push
   → Confirmar 20260818000002 aplicada (local = remote)

2. Schema validation via Management API:
   → enum verification_status com 7 valores
   → tabela identity_verifications com 18 colunas corretas
   → 4 indexes confirmados
   → FK account_user_id → account_users(id) ON DELETE CASCADE
   → CHECK constraints: age_requires_identity, country_format, provider_nonempty
   → RLS enabled: rowsecurity = true
   → 3 policies confirmadas

3. RLS real:
   → anon SELECT → 0 rows
   → User A SELECT → apenas próprio registro
   → User A não vê User B
   → authenticated INSERT → error 42501
   → authenticated UPDATE → 0 rows afetados
   → authenticated DELETE → error 42501

4. State transitions via admin client:
   → NOT_STARTED → PENDING → IN_REVIEW → VERIFIED (sequência feliz)
   → VERIFIED → PENDING (inválida) → bloqueada por guard

5. Webhook smoke test:
   → POST com assinatura inválida → 401
   → POST com assinatura válida + "Approved" + age_verified=true → VERIFIED
   → POST com mesmo event_id → 200, estado não muda

6. Gates:
   → canPublishProfile com VERIFIED → true
   → canPublishProfile com PENDING → false

7. Cleanup:
   → Deletar todos os usuários sintéticos
   → Confirmar CASCADE: account_users → identity_verifications
   → 0 dados sintéticos remanescentes
```

---

## 34. Didit configuration necessária

| Ação | Responsável | Quando |
|---|---|---|
| Criar conta no Didit Business Console (`business.didit.me`) | Owner | Antes da integração real |
| Criar e publicar Workflow (document + face + liveness + age) | Owner/Dev | Antes de integrar |
| Copiar `DIDIT_API_KEY` gerado | Owner | Antes de integrar |
| Configurar endpoint webhook: `https://app.domínio/api/webhooks/didit` | Owner/Dev | Antes de integrar |
| Copiar `DIDIT_WEBHOOK_SECRET` gerado para o webhook | Owner | Antes de integrar |
| Copiar `DIDIT_WORKFLOW_ID` do workflow publicado | Owner/Dev | Antes de integrar |
| Ativar sandbox/test mode | Dev | Para testes |

**Se não disponível:** toda implementação usa `MockVerificationProvider`. Integração real marcada `BLOCKED_BY_PROVIDER_CONFIGURATION`. Nenhuma funcionalidade de desenvolvimento é bloqueada.

---

## 35. Environment variables

| Variável | Escopo | Descrição |
|---|---|---|
| `DIDIT_API_KEY` | **SERVER_ONLY** | API key para `https://verification.didit.me`. Nunca com prefixo `NEXT_PUBLIC_`. |
| `DIDIT_WORKFLOW_ID` | **SERVER_ONLY** | ID do workflow publicado no Didit console. |
| `DIDIT_WEBHOOK_SECRET` | **SERVER_ONLY** | Secret HMAC para verificação `X-Signature-V2`. |
| `DIDIT_API_BASE_URL` | **SERVER_ONLY** | `https://verification.didit.me` — externalizável para sandbox vs prod. |

Nenhuma variável `NEXT_PUBLIC_` necessária. Toda comunicação com Didit é server-side.

---

## 36. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Didit credentials/sandbox não disponíveis | **HIGH** | MockProvider cobre testes. BLOCKED_BY_PROVIDER_CONFIGURATION documentado. |
| Normalizer mapeia `"Approved"` para VERIFIED sem confirmar age | **CRITICAL** | Regra explícita: `"Approved"` + `age_verified=false` → REJECTED. Testado exaustivamente. |
| Webhook replay / MITM | **HIGH** | HMAC-SHA256 + timingSafeEqual + idempotency event_id |
| Didit retorna campo age com nome diferente do esperado | **HIGH** | Fallback seguro: campo ausente = `age_verified=false` = REJECTED |
| CPF armazenado inadvertidamente em futuras PRs | **MEDIUM** | Decisão documentada; requer migration + aprovação explícita |
| Didit Terms/DPA não aprovados para produção | **HIGH** | DEC-007: provider provisional. Não vai para produção sem aprovação legal. |
| Provider lock-in (só Didit) | **MEDIUM** | Provider abstraction: trocar adapter sem reescrever domínio |
| Webhook IP não whitelistado em produção | **MEDIUM** | Documentar `18.203.201.92`; configurar antes do go-live |
| Retry Didit esgota → webhook perdido | **MEDIUM** | Fallback: polling via `GET /decision/`. Monitor de verificações presas. |
| LGPD — base legal para retenção de `identity_verifications` | **MEDIUM** | Requer revisão jurídica antes de produção. |
| `verify_status` exposto via RLS por bug | **MEDIUM** | DAL aplica `.select()` restrito; testes RLS real no Supabase DEV |

---

## 37. Decisões humanas necessárias

### D1 — Credenciais Didit (BLOQUEANTE para integração real)
**Contexto:** Conta Didit Business + API key + workflow + webhook secret são necessários para DiditProvider real.
**Opções:**
- (a) Fornecer credentials sandbox → DiditProvider real implementado
- (b) Não disponíveis agora → MockProvider; BLOCKED_BY_PROVIDER_CONFIGURATION

**Recomendação:** Implementar tudo com MockProvider primeiro; integrar Didit real quando credentials estiverem disponíveis. Não bloqueia testes, schema, gates, state machine, webhook handler nem UI.

---

### D2 — Política de retry após REJECTED
**Contexto:** Usuário rejeitado pode tentar novamente? Quantas vezes? Com cooldown?
**Opções:**
- (a) Sem limite de tentativas
- (b) Máximo N tentativas por janela de tempo (recomendado)
- (c) Apenas via suporte (mais restritivo)

**Recomendação:** Máximo 3 tentativas por janela de 30 dias, sem cooldown imediato. Configurável via constante.
**Impacto:** Define lógica na `startVerificationAction`. Menor mudança de schema se necessário.

---

### D3 — Expiração de verificações aprovadas
**Contexto:** KYC aprovado hoje: o usuário precisa re-verificar após algum período?
**Opções:**
- (a) Sem expiração (`expires_at = NULL`) — recomendado para esta fase
- (b) Expiração configurável (ex: 12 ou 24 meses)
- (c) Depende do contrato final com Didit

**Recomendação:** `expires_at = NULL` nesta fase. Campo já existe no schema para quando a política for definida.
**Impacto:** Baixo — campo nullable já contemplado.

---

### D4 — CPF check obrigatório ou opcional no workflow Didit
**Contexto:** Didit suporta CPF validation via Receita Federal/Datavalid como check adicional.
**Opções:**
- (a) Ativar CPF check no workflow → `cpf_verified` populado como boolean
- (b) Não ativar → `cpf_verified = NULL`

**Recomendação:** Ativar como check opcional no workflow Didit. Campo `cpf_verified: boolean | null` já comporta ambos os casos. CPF **não** é armazenado como número.
**Impacto:** Apenas configuração no Didit console; sem mudança de schema.

---

## 38. Confirmação de escopo

Esta fase implementa **exclusivamente:**
- Schema `identity_verifications` + enum `verification_status`
- Provider abstraction + MockProvider + DiditProvider (ou BLOCKED_BY_PROVIDER_CONFIGURATION)
- State machine com guard functions
- Webhook handler com HMAC-SHA256 e idempotência
- Gates: `canPublishProfile`, `canUploadAdultMedia`, `requireVerifiedAdvertiser`
- UI `/onboarding/verification` (status e CTA — sem design definitivo)
- Testes obrigatórios
- Validação real no Supabase DEV

**Explicitamente FORA DO ESCOPO desta fase:**

| Funcionalidade | Fase |
|---|---|
| Nome artístico / display name | FASE 03 |
| Perfil público | FASE 03 |
| Bio profissional | FASE 03 |
| Medidas, aparência (altura, peso, etc.) | FASE 03 |
| Fotos públicas | FASE 05 |
| Vídeos | Pós-MVP |
| Media storage / upload | FASE 05 |
| Marketplace search / catálogo público | FASE 04 |
| Filtros públicos | FASE 04 |
| Billing / planos de assinatura | FASE 07 |
| Boosts / monetização adicional | FASE 08 |
| AI Concierge | FASE 13 |
| WhatsApp | FASE 13 |
| CRM | Pós-MVP |
| Agenda | Pós-MVP |
| Growth scraper | FASE 10 |
| Moderation dashboard | FASE 06 |
| Analytics de negócio | FASE 09 |

---

**FASE 02 — IMPLEMENTATION PLAN COMPLETO.**

**NENHUM CÓDIGO SERÁ ESCRITO, NENHUMA MIGRATION CRIADA, NENHUM COMMIT FEITO E NENHUMA ALTERAÇÃO NO SUPABASE SERÁ REALIZADA ANTES DA APROVAÇÃO EXPLÍCITA.**
