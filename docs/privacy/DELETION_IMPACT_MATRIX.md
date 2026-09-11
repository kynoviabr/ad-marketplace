# Matriz de Impacto de Exclusão e Descarte — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Visão Geral

Esta matriz classifica a estratégia de descarte para cada uma das famílias de dados identificadas na arquitetura do Velvet.  
**Aviso Crítico de Governança:**  
* As estratégias indicadas como `RETAIN_WITH_JUSTIFICATION_REQUIRED` dependem de aprovação formal do departamento jurídico.
* Na Fase LGPD-01, **nenhum descarte destrutivo automático está habilitado**.

---

## 2. Matriz Consolidada

| Família de Dados | Tabelas / Armazenamento | Estratégia Técnica | Status Jurídico | Justificativa / Fundamentação |
| :--- | :--- | :--- | :--- | :--- |
| **Credenciais de Autenticação** | `auth.users` | `DELETE` | `BASELINE_TÉCNICO` | Eliminação da conta e revogação de tokens de acesso. |
| **Conta de Usuário** | `account_users`, `client_signup_intents` | `DELETE` | `BASELINE_TÉCNICO` | Exclusão do registro de domínio do usuário. |
| **Registros de KYC / Maioridade** | `identity_verifications`, `verification_webhook_events` | `RETAIN_WITH_JUSTIFICATION_REQUIRED` | `LEGAL_APPROVAL_REQUIRED` | Prova mandatória de maioridade (18+) para defesa legal contra alegações de anúncio de menores (ECA Art. 240-241). Período de retenção sugerido: 5 anos. |
| **Perfil Profissional e Atributos** | `professional_profiles`, `profile_locations`, `profile_offerings` | `DELETE` | `BASELINE_TÉCNICO` | Remoção imediata da visibilidade pública e índices de busca. |
| **Arquivos de Mídia (Fotos e Vídeos)** | `profile_media`, `profile_videos`, Buckets: `profile-media`, `profile-videos` | `DELETE` (Coordenado) | `BASELINE_TÉCNICO` | Remoção física dos arquivos nos buckets e exclusão dos metadados no banco de dados. |
| **Trilha de Auditoria de Moderação** | `profile_moderation_reviews`, `media_moderation_reviews`, `profile_status_events` | `RETAIN_WITH_JUSTIFICATION_REQUIRED` | `LEGAL_APPROVAL_REQUIRED` | Comprovação de moderação ativa e conformidade com o Marco Civil da Internet (Art. 19). Período sugerido: 3 anos. |
| **Registros Fiscais e Assinaturas** | `subscriptions`, `billing_webhook_events`, `billing_overrides`, `billing_admin_audit_logs` | `RETAIN_WITH_JUSTIFICATION_REQUIRED` | `LEGAL_APPROVAL_REQUIRED` | Retenção obrigatória por 5 anos pelo Código Tributário Nacional (CTN Art. 174) e Código Civil (Art. 206). Vínculo pessoal deve ser desvinculado (SET NULL). |
| **Avaliações da Comunidade** | `professional_reviews`, `professional_review_responses` | `ANONYMIZE` | `LEGAL_APPROVAL_REQUIRED` | Anonimização do texto e desvinculação do autor para preservar integridade da nota média do profissional sem reter PII do avaliador. |
| **Membro VIP do Cliente** | `client_memberships` | `DELETE` | `BASELINE_TÉCNICO` | Exclusão direta junto com a conta de cliente. |
| **Telemetria de Uso** | `analytics_events`, `profile_daily_metrics` | `ANONYMIZE` | `BASELINE_TÉCNICO` | Eventos brutos possuem apenas `visitor_session_id` pseudônimo; métricas agregadas diárias são mantidas como estatística puramente anônima. |
| **Agenda e Disponibilidade** | `professional_availability_*` | `DELETE` | `BASELINE_TÉCNICO` | Exclusão direta em cascata com o perfil. |
| **AI Concierge (Mensagens)** | `concierge_conversations`, `concierge_messages` | `DELETE` | `LEGAL_APPROVAL_REQUIRED` | Exclusão das conversas ao descartar o perfil ou após expiração da janela (proposta 90 dias). |
| **Controle de Taxa (Rate Limits)** | `distributed_rate_limits` | `DELETE` | `BASELINE_TÉCNICO` | Expiração automática de janelas efêmeras de 15 minutos. |
| **Livro-Razão de Solicitações LGPD** | `data_subject_requests`, `data_subject_request_events` | `RETAIN_WITH_JUSTIFICATION_REQUIRED` | `LEGAL_APPROVAL_REQUIRED` | Comprovação de cumprimento das obrigações legais perante a ANPD e titulares (LGPD Art. 18 e 19). Retenção sugerida: 5 anos. |
