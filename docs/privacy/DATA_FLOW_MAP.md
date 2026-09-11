# Mapa de Fluxos de Dados e Processamento — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Fluxo de Cadastro e Onboarding do Anunciante

```mermaid
sequenceDiagram
  autonumber
  actor Anunciante
  participant Front as Frontend (Vercel)
  participant Auth as Supabase Auth
  participant DB as Postgres (DEV)
  participant Didit as Didit (KYC)

  Anunciante->>Front: Preenche e-mail e senha
  Front->>Auth: signUp()
  Auth-->>Front: Sessão autenticada (JWT)
  Front->>DB: Trigger handle_new_auth_user() cria account_users (role=ADVERTISER)
  Anunciante->>Front: Aceita Termos e Política de Privacidade
  Front->>DB: Registra terms_version e privacy_version com timestamp
  Anunciante->>Front: Inicia Verificação de Identidade (18+)
  Front->>Didit: Redireciona / Inicia sessão KYC
  Didit-->>DB: Webhook status.updated (age_verified, cpf_verified)
  DB->>DB: Atualiza identity_verifications (VERIFIED)
  Anunciante->>Front: Cadastra perfil, fotos e horários
  Front->>DB: Insere professional_profiles, profile_media, etc.
```

---

## 2. Fluxo de Entrega Segura de Mídia (Zero-Trust Signed URLs)

```mermaid
sequenceDiagram
  autonumber
  actor Visitante
  participant Web as Web / Search Page
  participant DAL as Media Delivery Layer
  participant DB as Supabase DB
  participant Storage as Supabase Storage (Private)

  Visitante->>Web: Acessa busca ou perfil
  Web->>DAL: getApprovedMediaDeliveryUrl(media)
  DAL->>DB: Consulta v_publication_eligible_profiles
  alt Perfil Ativo, KYC Válido, Assinatura Válida e Mídia APROVADA
    DAL->>Storage: createSignedUrl(storage_path, expiresIn=3600)
    Storage-->>DAL: URL assinada temporária (1 hora)
    DAL-->>Web: Renderiza imagem com URL assinada
    Web-->>Visitante: Exibe foto protegida
  else Qualquer portão de elegibilidade falhar
    DAL-->>Web: Retorna null (Fail Closed)
    Web-->>Visitante: Exibe placeholder neutro
  end
```

---

## 3. Fluxo de Telemetria e Métricas Sem Armazenamento de IP

```mermaid
sequenceDiagram
  autonumber
  actor Visitante
  participant Browser as Navegador do Visitante
  participant API as /api/analytics/events (Server)
  participant RateLimiter as Distributed Rate Limiter
  participant DB as analytics_events

  Browser->>API: Envia evento (PROFILE_IMPRESSION / CONTACT_CLICK)
  Note over API: Extrai cabeçalho x-forwarded-for
  API->>RateLimiter: Calcula HMAC-SHA256(IP, SECRET)
  Note over RateLimiter: O IP bruto NUNCA é armazenado nem logado
  alt Limite excedido (>300 req/h)
    API-->>Browser: HTTP 429 Too Many Requests
  else Dentro do limite
    API->>DB: Insere evento com visitor_session_id pseudônimo
    DB-->>API: Gravado com sucesso
    API-->>Browser: HTTP 200 OK
  end
```

---

## 4. Fluxo de Solicitação de Direitos do Titular (LGPD DSR)

```mermaid
sequenceDiagram
  autonumber
  actor Titular as Titular Autenticado
  participant Action as createDataSubjectRequestAction()
  participant Guard as requireAccount()
  participant DSR as data_subject_requests
  participant Ledger as data_subject_request_events (Append-only)

  Titular->>Action: Envia tipo de direito (ex: DELETION, ACCESS)
  Action->>Guard: Valida sessão do servidor
  Guard-->>Action: Retorna account.id legítimo da sessão
  Note over Action: Ignora qualquer ID de conta fornecido no payload do cliente
  Action->>DSR: Verifica idempotência (solicitação ativa em andamento?)
  alt Já existe solicitação ativa
    Action-->>Titular: Erro: Solicitação em andamento
  else Nenhuma duplicata
    Action->>DSR: Insere solicitação (Status: RECEIVED)
    Action->>Ledger: Insere evento REQUEST_CREATED (Imutável)
    Note over Action: NENHUMA exclusão automática é disparada na criação
    Action-->>Titular: Sucesso (Retorna DTO seguro)
  end
```
