# Inventário de Mecanismos de Consentimento e Aceite — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Visão Geral

Este documento detalha todos os pontos de captura de manifestação de vontade dos usuários no Velvet Marketplace, distinguindo adequadamente entre **Consentimento Específico**, **Aceite Contratual**, **Ciência de Políticas** e **Ativação de Funcionalidades**.

---

## 2. Tabela de Mecanismos de Consentimento e Aceite

| Identificador | Natureza Jurídica | Finalidade | Ponto de Captura | Versão Atual | Evidência de Auditoria | Revogação Suportada |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`COOKIE_ANALYTICS`** | Consentimento Específico (LGPD Art. 7, I) | Autorização para disparo de telemetria analítica no navegador do visitante. | Modal de Preferências de Cookies (`public-compliance-layer.tsx`) | `r6-v1` | Cookie de cliente `velvet_cookie_consent` | **SIM.** Através do evento `velvet:open-cookie-preferences`, o usuário pode reabrir o modal, desmarcar a opção e limpar as chaves de telemetria no localStorage. |
| **`ADULT_GATE_18`** | Declaração de Idade / Consentimento de Acesso | Confirmação afirmativa de que o visitante possui 18 anos ou mais antes de acessar o marketplace de anúncios adultos. | Modal Bloqueante Adult Gate (`public-compliance-layer.tsx`) | `1.0` | Cookie de cliente `velvet_adult_access=true` (validade de 180 dias) | **SIM.** Ao limpar os cookies do navegador, o modal bloqueante é imediatamente restabelecido. |
| **`TERMS_OF_USE`** | Aceite Contratual (Marco Civil Art. 7 / Código Civil) | Aceite do contrato de adesão e regras da plataforma para publicação de anúncios. | Formulário de Cadastro (`signup/page.tsx` / `modules/auth/actions.ts`) | `1.0` (definida em `lib/config/legal-versions.ts`) | Banco de dados: `account_users.terms_version` e `account_users.terms_accepted_at` | **NÃO.** Trata-se de vínculo contratual. A rescisão opera via solicitação de encerramento de conta/exclusão, não por mera revogação de consentimento. |
| **`PRIVACY_POLICY`** | Ciência de Política de Privacidade (LGPD Art. 9) | Comprovação de transparência e ciência do tratamento de dados pessoais. | Formulário de Cadastro (`signup/page.tsx`) | `1.0` (definida em `lib/config/legal-versions.ts`) | Banco de dados: `account_users.privacy_version` e `account_users.privacy_accepted_at` | **NÃO.** O exercício de direitos decorre diretamente dos canais DSR da LGPD. |
| **`CONCIERGE_OPT_IN`** | Configuração de Funcionalidade | Autorização expressa do profissional para que o assistente virtual responda dúvidas de visitantes em seu nome. | Painel de Configurações do Concierge no Dashboard | `1.0` | Banco de dados: `professional_concierge_settings.enabled` | **SIM.** O profissional pode desmarcar a opção `enabled=false` a qualquer momento no dashboard, suspendendo o assistente de forma imediata. |
