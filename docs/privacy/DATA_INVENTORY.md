# Inventário Canônico de Dados Pessoais — Velvet

> **Fase:** LGPD-01.1 — Privacy Inventory Closure  
> **Data de Auditoria:** 11/09/2026  
> **Ambiente:** DEV (`mwzlunkkyigxzjpnybxj.supabase.co`)  
> **Status:** AUDITADO E CONSOLIDADO (RE-AUDITORIA DE DADOS SENSÍVEIS CONCLUÍDA)  

---

## 1. Visão Geral

Este documento consolida o mapeamento exaustivo de todos os locais onde o **Velvet Marketplace** armazena, processa ou transita dados de titulares (anunciantes, clientes, visitantes e operadores). A auditoria foi realizada diretamente sobre o esquema em banco de dados DEV, storage buckets do Supabase, autenticação e cookies de cliente.

---

## 2. Taxonomia de Classificação e Níveis de Sensibilidade (LGPD Art. 5º, II)

Os dados técnicos do Velvet são categorizados segundo duas dimensões complementares: a **Classificação Geral** e o **Nível Específico de Sensibilidade**.

### 2.1. Níveis Específicos de Sensibilidade (LGPD-01.1)

1. **`SENSITIVE_DATA_CONFIRMED`**: Dados que revelam categoricamente aspectos da vida sexual, dados de saúde ou processamento biométrico inequívoco.
   * *Exemplos:* Modalidades e preferências sexuais declaradas explicitamente em `professional_profile_offerings` e `professional_offering_options` (`service_oral`, `service_anal`, `service_bdsm`, `service_fetishes`, `audience_couples`, `audience_men`, `audience_women`).
   * *Biometria:* O processamento biométrico facial ocorre **no operador externo Didit** durante a validação de vivacidade.
2. **`POTENTIALLY_SENSITIVE_FREE_TEXT`**: Campos de texto livre onde o usuário ou anunciante pode inserir espontaneamente dados pessoais sensíveis (preferências íntimas, histórico de saúde, orientação, etc.).
   * *Exemplos:* `bio` de anunciantes, `concierge_faqs`, `concierge_messages`, comentários em `professional_reviews`, `professional_review_responses`, e narrativas de `content_reports`.
3. **`HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE`**: Conteúdos de alto risco de privacidade ou dano material/moral que não se enquadram textualmente no rol taxativo do Art. 5º, II da LGPD sem interpretação jurídica prévia.
   * *Exemplos:* Imagens e vídeos de ensaios adultos em buckets privados (`profile-media`, `profile-videos`), atributos físicos declarados, metadados de status KYC (`identity_verifications`).
4. **`NOT_SENSITIVE`**: Dados cadastrais comuns, parâmetros técnicos e registros comerciais padrão.
   * *Exemplos:* E-mail, status de assinatura, slugs de bairros, contadores analíticos e flags operacionais.

### 2.2. Classes Gerais de Dados

| Classificação | Definição Técnica | Exemplos no Velvet |
| :--- | :--- | :--- |
| `AUTHENTICATION` | Credenciais e dados de controle de acesso | Senhas com hash, e-mails de login, tokens de sessão |
| `PRIVATE_PERSONAL` | Dados pessoais privados do titular | Telefones privados, timezone, preferências de agenda |
| `PUBLIC_PERSONAL` | Dados publicados por escolha do titular para divulgação | Nome artístico, bio, fotos públicas, bairros de atendimento |
| `SENSITIVE_OR_HIGH_RISK` | Mídias íntimas ou preferências sexuais | Fotos/vídeos em buckets restritos, serviços sexuais ofertados |
| `KYC_REFERENCE` | Registros de verificação de identidade e maioridade | ID de sessão de provedor, flags `identity_verified`, `age_verified` |
| `USER_GENERATED_CONTENT` | Conteúdo gerado pelo usuário | Avaliações, respostas a reviews, descrições |
| `FINANCIAL_REFERENCE` | Contratos e status de planos comerciais | Assinaturas de anunciantes, campanhas de boost |
| `BEHAVIORAL_ANALYTICS` | Métricas comportamentais pseudonimizadas | Cliques em contatos, visualizações por sessão |
| `OPERATIONAL_SECURITY` | Logs de tráfego, limites de taxa e flags de segurança | Chaves HMAC de rate limit, hashes de denunciantes |
| `AUDIT_RECORD` | Registros imutáveis de trilhas de auditoria | Decisões de moderação, eventos de status de perfil, DSRs |
| `ANONYMIZED_OR_AGGREGATED` | Métricas puramente estatísticas sem vínculo individual | Métricas diárias consolidadas da plataforma |

---

## 3. Inventário Detalhado por Família de Dados

### 3.1. Identidade e Autenticação
* **`auth.users`** (Supabase Auth): E-mail, hash de senha criptografada, telefone, `raw_user_meta_data`. Sensibilidade: `NOT_SENSITIVE`.
* **`public.account_users`**: Raiz da conta no domínio Velvet (`auth_user_id`, `role`, `status`, `onboarding_status`, versões de termos e privacidade aceitas). Sensibilidade: `NOT_SENSITIVE`.
* **`public.client_signup_intents`**: Tokens temporários de cadastro de cliente (10 min TTL, hash SHA-256). Sensibilidade: `NOT_SENSITIVE`.

### 3.2. Verificação de Identidade (KYC) e Processamento Biométrico
* **`public.identity_verifications`**: Status da verificação Didit (`provider_session_id`, `identity_verified`, `age_verified`, `cpf_verified`, `verified_country`). Sensibilidade: `HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE`.  
  *Separação de Fluxos:*
  * **Velvet Armazena Localmente:** Apenas flags booleanas (`age_verified`, `identity_verified`), ID da sessão e carimbos de data/hora. **Zero imagens de documentos, zero selfies e zero vetores biométricos são persistidos no Velvet.**
  * **Didit Processa Externamente:** Extração de template biométrico facial, teste de vivacidade, OCR de documentos e checagem em cadastros oficiais (`SENSITIVE_DATA_CONFIRMED` no provedor).
* **`public.verification_webhook_events`**: Livro-razão de webhooks recebidos do Didit (`provider_event_id`, status de processamento). Sensibilidade: `NOT_SENSITIVE`.

### 3.3. Perfil Profissional e Preferências Íntimas
* **`public.professional_profiles`**: Nome artístico, bio (texto livre: `POTENTIALLY_SENSITIVE_FREE_TEXT`), atributos físicos declarados (`HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE`), telefones de contato, configurações de audiência (`PUBLIC`, `VIP_ONLY`).
* **`public.professional_profile_locations`**: Vínculo entre o perfil e bairros/cidades atendidos. Sensibilidade: `NOT_SENSITIVE`.
* **`public.professional_profile_offerings` & `public.professional_offering_options`**: Catálogo de serviços adultos ofertados (`service_oral`, `service_anal`, `service_bdsm`, `service_fetishes`, etc.) e público-alvo atendido (`audience_men`, `audience_women`, `audience_couples`). Sensibilidade: **`SENSITIVE_DATA_CONFIRMED`** (Dado revelador de vida sexual sob o Art. 5º, II da LGPD).

### 3.4. Ativos de Mídia e Armazenamento (Storage)
* **`public.profile_media`**: Metadados de fotos (dimensões, tipo MIME, status de moderação, ordenação). Sensibilidade: `NOT_SENSITIVE`.
* **Bucket `profile-media`** (Privado): Arquivos de imagem criptografados/restritos contendo ensaios fotográficos de anunciantes adultos. Sensibilidade: `HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE`.
* **`public.profile_videos`**: Metadados de vídeos curtos. Sensibilidade: `NOT_SENSITIVE`.
* **Bucket `profile-videos`** (Privado): Clipes de vídeo íntimos/profissionais em formato MP4/WebM. Sensibilidade: `HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE`.

### 3.5. Auditoria de Moderação e Denúncias
* **`public.media_moderation_reviews`**: Histórico de aprovações/rejeições de fotos (`reviewer_id`, código de motivo, observações). Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT` (nas observações do operador).
* **`public.profile_moderation_reviews`**: Histórico de moderação de textos de perfil com snapshot de conteúdo. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.
* **`public.profile_video_moderation_events`**: Histórico de moderação de vídeos. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.
* **`public.professional_profile_status_events`**: Livro-razão estritamente imutável (append-only) de suspensões e reativações. Sensibilidade: `NOT_SENSITIVE`.
* **`public.content_reports`**: Denúncias de abuso da comunidade. Descrição da denúncia é texto livre (`POTENTIALLY_SENSITIVE_FREE_TEXT`). O identificador do denunciante é pseudonimizado via HMAC-SHA256 (`ABUSE_PEPPER`).

### 3.6. Faturamento, Planos e Monetização
* **`public.subscriptions`**: Contratos de assinatura ativa dos profissionais. Sensibilidade: `NOT_SENSITIVE`.
* **`public.billing_webhook_events`**: Livro-razão de webhooks simulados (apenas mock ativo). Sensibilidade: `NOT_SENSITIVE`.
* **`public.billing_overrides` & `public.entitlement_overrides`**: Concessões administrativas de gratuidade/Founder. Sensibilidade: `NOT_SENSITIVE`.
* **`public.billing_admin_audit_logs`**: Log de auditoria administrativa de cobrança. Sensibilidade: `NOT_SENSITIVE`.
* **`public.profile_boosts`**: Campanhas de destaque patrocinado. Sensibilidade: `NOT_SENSITIVE`.

### 3.7. Comunidade e Avaliações
* **`public.professional_reviews`**: Notas e comentários de clientes autenticados. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.
* **`public.professional_review_responses`**: Respostas dos profissionais às avaliações recebidas. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.
* **`public.review_reports`**: Denúncias sobre comentários indevidos. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.
* **`public.professional_review_moderation_events`**: Auditoria de moderação de reviews. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.

### 3.8. Clientes e Membros VIP
* **`public.client_memberships`**: Nível de assinatura do cliente (`FREE` ou `VIP`) e validade. Sensibilidade: `NOT_SENSITIVE`.

### 3.9. Telemetria e Métricas de Uso
* **`public.analytics_events`**: Eventos de interação com `visitor_session_id` pseudônimo. Sensibilidade: `NOT_SENSITIVE`.
* **`public.profile_daily_metrics` & `public.platform_daily_metrics`**: Agregações numéricas puramente anônimas. Sensibilidade: `NOT_SENSITIVE`.

### 3.10. Agenda e Disponibilidade Operacional
* **`public.professional_availability_settings` & `public.professional_weekly_availability`**: Horários de atendimento. Sensibilidade: `NOT_SENSITIVE`.
* **`public.professional_availability_exceptions`**: Bloqueios de data ou horários customizados. Sensibilidade: `NOT_SENSITIVE`.

### 3.11. AI Concierge (Estagiado / Desativado)
* **`public.professional_concierge_settings`**: Configuração do assistente. Sensibilidade: `NOT_SENSITIVE`.
* **`public.professional_concierge_faqs`**: FAQs cadastradas pela profissional. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.
* **`public.concierge_conversations` & `public.concierge_messages`**: Sessões e mensagens de chat. Sensibilidade: `POTENTIALLY_SENSITIVE_FREE_TEXT`.

### 3.12. Segurança e Controle de Taxa
* **`public.distributed_rate_limits`**: Contadores de taxa baseados em chaves HMAC-SHA256. Sensibilidade: `NOT_SENSITIVE`.

### 3.13. Direitos dos Titulares (LGPD-01)
* **`public.data_subject_requests` & `public.data_subject_request_events`**: Livro-razão de solicitações e eventos de DSR. Sensibilidade: `NOT_SENSITIVE`.

### 3.14. Cookies e Armazenamento no Cliente
* **Cookie `velvet_adult_access`**: Gate 18+. Sensibilidade: `NOT_SENSITIVE`.
* **Cookie `velvet_cookie_consent`**: Consentimento de cookies. Sensibilidade: `NOT_SENSITIVE`.
* **LocalStorage `ad_mkt_vsid`**: Sessão pseudônima de analytics. Sensibilidade: `NOT_SENSITIVE`.
* **LocalStorage `ad_mkt_imp_seen`**: Deduplicação de impressões. Sensibilidade: `NOT_SENSITIVE`.

---

## 4. Política de Retenção Canônica

Todos os 46+ itens deste inventário possuem seu status de retenção marcado rigorosamente como:
**`RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)`**
Nenhum prazo de 5 anos ou qualquer outro período legal presumido pela engenharia permanece no inventário.
