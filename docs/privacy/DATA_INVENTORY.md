# Inventário Canônico de Dados Pessoais — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Data de Auditoria:** 10/09/2026  
> **Ambiente:** DEV (`mwzlunkkyigxzjpnybxj.supabase.co`)  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Visão Geral

Este documento consolida o mapeamento exaustivo de todos os locais onde o **Velvet Marketplace** armazena, processa ou transita dados de titulares (anunciantes, clientes, visitantes e operadores). A auditoria foi realizada diretamente sobre o esquema em banco de dados DEV, storage buckets do Supabase, autenticação e cookies de cliente.

---

## 2. Taxonomia de Classificação de Dados

Os dados técnicos do Velvet são categorizados segundo as seguintes classes controladas:

| Classificação | Definição Técnica | Exemplos no Velvet |
| :--- | :--- | :--- |
| `AUTHENTICATION` | Credenciais e dados de controle de acesso | Senhas com hash, e-mails de login, tokens de sessão |
| `PRIVATE_PERSONAL` | Dados pessoais privados do titular | Telefones privados, timezone, preferências de agenda |
| `PUBLIC_PERSONAL` | Dados publicados por escolha do titular para divulgação | Nome artístico, bio, fotos públicas, bairros de atendimento |
| `SENSITIVE_OR_HIGH_RISK` | Mídias íntimas/sensíveis ou dados de alta criticidade | Fotos e vídeos armazenados em buckets privados |
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
* **`auth.users`** (Supabase Auth): E-mail, hash de senha criptografada, telefone, `raw_user_meta_data`. Classificação: `AUTHENTICATION`.
* **`public.account_users`**: Raiz da conta no domínio Velvet (`auth_user_id`, `role`, `status`, `onboarding_status`, versões de termos e privacidade aceitas). Classificação: `PRIVATE_PERSONAL`.
* **`public.client_signup_intents`**: Tokens temporários de cadastro de cliente (10 min TTL, hash SHA-256). Classificação: `OPERATIONAL_SECURITY`.

### 3.2. Verificação de Identidade (KYC)
* **`public.identity_verifications`**: Status da verificação Didit (`provider_session_id`, `identity_verified`, `age_verified`, `cpf_verified`, `verified_country`). Classificação: `KYC_REFERENCE`.  
  *Nota de Minimização:* O Velvet **não armazena** imagens de documentos, selfies biométricas, datas completas de nascimento ou números de CPF em texto claro.
* **`public.verification_webhook_events`**: Livro-razão de webhooks recebidos do Didit (`provider_event_id`, status de processamento). Classificação: `AUDIT_RECORD`.

### 3.3. Perfil Profissional e Conteúdo Comercial
* **`public.professional_profiles`**: Nome artístico, bio, atributos físicos declarados, telefones de contato (WhatsApp, direto, Telegram), configurações de audiência (`PUBLIC`, `VIP_ONLY`). Classificação: `PUBLIC_PERSONAL`.
* **`public.professional_profile_locations`**: Vínculo entre o perfil e bairros/cidades atendidos. Classificação: `PUBLIC_PERSONAL`.
* **`public.professional_profile_offerings`**: Catálogo de serviços anunciados com valores praticados. Classificação: `PUBLIC_PERSONAL`.

### 3.4. Ativos de Mídia e Armazenamento (Storage)
* **`public.profile_media`**: Metadados de fotos (dimensões, tipo MIME, status de moderação, ordenação). Classificação: `USER_GENERATED_CONTENT`.
* **Bucket `profile-media`** (Privado): Arquivos de imagem criptografados/restritos. Entrega exclusiva por URLs assinadas (1 hora) sob aprovação e elegibilidade canônica. Classificação: `SENSITIVE_OR_HIGH_RISK`.
* **`public.profile_videos`**: Metadados de vídeos curtos (duração, status de moderação, caminho de pôster). Classificação: `USER_GENERATED_CONTENT`.
* **Bucket `profile-videos`** (Privado): Clipes de vídeo em formato MP4/WebM e pôsteres JPEG. URLs assinadas com 900s de validade. Classificação: `SENSITIVE_OR_HIGH_RISK`.

### 3.5. Auditoria de Moderação e Segurança Operacional
* **`public.media_moderation_reviews`**: Histórico de aprovações/rejeições de fotos por administradores (`reviewer_id`, código de motivo, observações). Classificação: `AUDIT_RECORD`.
* **`public.profile_moderation_reviews`**: Histórico de moderação de textos de perfil com snapshot de conteúdo. Classificação: `AUDIT_RECORD`.
* **`public.profile_video_moderation_events`**: Histórico de moderação de vídeos. Classificação: `AUDIT_RECORD`.
* **`public.professional_profile_status_events`**: Livro-razão estritamente imutável (append-only) de suspensões e reativações de anunciantes. Classificação: `AUDIT_RECORD`.
* **`public.content_reports`**: Denúncias de abuso da comunidade. O identificador do denunciante é armazenado como hash HMAC-SHA256 (`reporter_hash`) com segredo de pimenta (`ABUSE_PEPPER`). Nenhum IP em texto claro é persistido. Classificação: `OPERATIONAL_SECURITY`.

### 3.6. Faturamento, Planos e Monetização
* **`public.subscriptions`**: Contratos de assinatura ativa dos profissionais, ciclo de faturamento e renovação. Classificação: `FINANCIAL_REFERENCE`.
* **`public.billing_webhook_events`**: Livro-razão de webhooks de pagamento. Classificação: `AUDIT_RECORD`.
* **`public.billing_overrides` & `public.entitlement_overrides`**: Concessões administrativas de gratuidade/testes. Classificação: `AUDIT_RECORD`.
* **`public.billing_admin_audit_logs`**: Log de auditoria de alterações em limites ou status de faturamento por administradores. Classificação: `AUDIT_RECORD`.
* **`public.profile_boosts`**: Campanhas de destaque patrocinado e janelas temporais de exibição. Classificação: `FINANCIAL_REFERENCE`.

### 3.7. Comunidade e Avaliações
* **`public.professional_reviews`**: Notas (1-5) e comentários enviados por clientes autenticados. Classificação: `USER_GENERATED_CONTENT`.
* **`public.professional_review_responses`**: Respostas dos profissionais às avaliações recebidas. Classificação: `USER_GENERATED_CONTENT`.
* **`public.review_reports`**: Denúncias sobre comentários indevidos. Classificação: `OPERATIONAL_SECURITY`.
* **`public.professional_review_moderation_events`**: Auditoria de moderação de reviews e respostas. Classificação: `AUDIT_RECORD`.

### 3.8. Clientes e Membros VIP
* **`public.client_memberships`**: Nível de assinatura do cliente (`FREE` ou `VIP`) e validade. Classificação: `PRIVATE_PERSONAL`.

### 3.9. Telemetria e Métricas de Uso
* **`public.analytics_events`**: Eventos de interação (impressões, cliques em contato, buscas). Não armazena IP. Usa `visitor_session_id` pseudônimo gerado no cliente. Classificação: `BEHAVIORAL_ANALYTICS`.
* **`public.profile_daily_metrics`**: Agregações numéricas diárias por perfil (total de visualizações, cliques no WhatsApp/Telefone). Classificação: `ANONYMIZED_OR_AGGREGATED`.
* **`public.platform_daily_metrics`**: Contadores agregados globais da plataforma. Classificação: `ANONYMIZED_OR_AGGREGATED`.

### 3.10. Agenda e Disponibilidade Operacional
* **`public.professional_availability_settings`**: Parâmetros de agendamento (fuso horário, antecedência mínima, duração dos intervalos). Classificação: `PRIVATE_PERSONAL`.
* **`public.professional_weekly_availability`**: Janelas semanais recorrentes de atendimento. Classificação: `PUBLIC_PERSONAL`.
* **`public.professional_availability_exceptions`**: Bloqueios de data ou horários customizados. Classificação: `PRIVATE_PERSONAL`.

### 3.11. AI Concierge (Estagiado / Desativado)
* **`public.professional_concierge_settings`**: Configuração do assistente virtual por perfil. Classificação: `PRIVATE_PERSONAL`.
* **`public.professional_concierge_faqs`**: Perguntas e respostas personalizadas cadastradas pelo anunciante. Classificação: `PUBLIC_PERSONAL`.
* **`public.concierge_conversations`**: Sessões de conversa de visitantes com o assistente virtual. Classificação: `PRIVATE_PERSONAL`.
* **`public.concierge_messages`**: Mensagens trocadas no chat do assistente. Traços de raciocínio de modelo são removidos antes da gravação. Classificação: `PRIVATE_PERSONAL`.

### 3.12. Segurança e Controle de Taxa
* **`public.distributed_rate_limits`**: Contadores de janela deslizante baseados em chaves HMAC-SHA256 para proteção contra ataques de força bruta. Classificação: `OPERATIONAL_SECURITY`.

### 3.13. Direitos dos Titulares (LGPD-01)
* **`public.data_subject_requests`**: Livro-razão canônico de solicitações LGPD de titulares. Classificação: `AUDIT_RECORD`.
* **`public.data_subject_request_events`**: Livro-razão imutável de eventos do ciclo de vida das solicitações. Classificação: `AUDIT_RECORD`.

### 3.14. Cookies e Armazenamento no Cliente
* **Cookie `velvet_adult_access`**: Confirmação de maioridade 18+ (validade: 180 dias). Classificação: `OPERATIONAL_SECURITY`.
* **Cookie `velvet_cookie_consent`**: Preferências de consentimento (`necessary: true`, `analytics: boolean`, versão `r6-v1`). Classificação: `OPERATIONAL_SECURITY`.
* **LocalStorage `ad_mkt_vsid`**: Identificador pseudônimo da sessão de visita para telemetria. Classificação: `BEHAVIORAL_ANALYTICS`.
* **LocalStorage `ad_mkt_imp_seen`**: Cache efêmero de IDs de perfis visualizados para deduplicação de impressões. Classificação: `OPERATIONAL_SECURITY`.
