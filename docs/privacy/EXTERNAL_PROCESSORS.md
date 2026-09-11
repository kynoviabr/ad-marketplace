# Inventário de Operadores e Subprocessadores Externos — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Visão Geral

Este documento inventaria os subprocessadores e integrações externas confirmadas que recebem ou processam dados de usuários do Velvet.

*Aviso:* Nenhum valor de credencial ou chave de API está exposto. Somente identificadores de configuração e provedores presentes no repositório foram incluídos.

---

## 2. Inventário de Provedores Confirmados

### 2.1. Supabase Inc.
* **Função no Velvet:** Banco de dados em nuvem (PostgreSQL), serviço de autenticação (`auth.users`), buckets de armazenamento de mídia (`profile-media`, `profile-videos`), gateway de API PostgREST.
* **Categorias de Dados Transmitidos:** Credenciais, e-mails, dados de perfis, fotos, vídeos, trilhas de auditoria e telemetria.
* **Identificadores Transmitidos:** E-mails, telefones, UUIDs internos de titular, IP de transporte.
* **Transferência Internacional de Dados:** SIM. Infraestrutura em nuvem na região AWS `sa-east-1` (São Paulo), operada pela Supabase Inc. (jurisdição: Delaware, Estados Unidos).
* **Capacidade de Exclusão:** SUPORTADA via API administrativa (`deleteUser()`, `remove()` em Storage, rotinas SQL).
* **Status de DPA (Data Processing Agreement):** `NOT_REVIEWED` (A ser formalizado na contratação de produção).

### 2.2. Vercel Inc.
* **Função no Velvet:** Hospedagem de frontend, execução de Serverless Functions / Server Actions, CDN global de borda (Edge Network).
* **Categorias de Dados Transmitidos:** Cabeçalhos HTTP efêmeros, cookies de sessão (`sb-...`, `velvet_cookie_consent`), parâmetros de Server Actions.
* **Identificadores Transmitidos:** Endereços IP dos clientes na camada de borda, cabeçalhos User-Agent, cookies de autenticação em trânsito.
* **Transferência Internacional de Dados:** SIM. Roteamento de borda e infraestrutura de computação sediada nos Estados Unidos com nós de CDN no Brasil.
* **Capacidade de Exclusão:** Retenção temporária padrão de logs de acesso da Vercel.
* **Status de DPA:** `NOT_REVIEWED`.

### 2.3. Didit (Didit Verification)
* **Função no Velvet:** Validação automatizada de documentos de identificação oficial, cálculo de maioridade (18+), e biometria facial (liveness check).
* **Categorias de Dados Transmitidos:** Solicitação de abertura de sessão de verificação vinculando o `account_user_id` do anunciante no campo `vendor_data`.
* **Identificadores Transmitidos:** `vendor_data` (`account_user_id` em UUID). O Velvet **não envia** nome ou e-mail na chamada de sessão.
* **Dados Retornados ao Velvet:** Notificações de webhook (`status.updated`, `data.updated`) contendo o resultado (`VERIFIED` / `REJECTED`), a confirmação documental de maioridade (`age_verified: boolean`) e a validação do CPF (`cpf_verified: boolean`). O Velvet **não recebe nem armazena** cópias de documentos ou fotos de biometria.
* **Transferência Internacional de Dados:** SIM. Servidores da Didit localizados na União Europeia (Espanha).
* **Capacidade de Exclusão:** DESCONHECIDA / REQUER INTEGRAÇÃO. É necessário verificar a API da Didit para propagar solicitações de eliminação de dados (DSR erasure) na plataforma do provedor.
* **Status de DPA:** `NOT_REVIEWED`.

### 2.4. OpenAI, L.L.C. (Estagiado / Desativado)
* **Função no Velvet:** Geração de linguagem natural para o assistente virtual AI Concierge.
* **Status Atual:** **DESATIVADO EM PRODUÇÃO** via flags `CONCIERGE_WEB_PUBLIC_ENABLED=false` e `CONCIERGE_RETENTION_POLICY_APPROVED=false`.
* **Categorias de Dados Transmitidos (Quando ativo):** Texto da mensagem do visitante no chat; fatos públicos do perfil (preços cadastrados, bairros, horários de atendimento, perguntas frequentes pré-aprovadas).
* **Identificadores Transmitidos:** Nenhum identificador de conta ou e-mail é enviado no prompt.
* **Transferência Internacional de Dados:** SIM. Servidores da OpenAI nos Estados Unidos.
* **Capacidade de Exclusão:** SUPORTADA via política de retenção zero / exclusão de chamadas de API da OpenAI (30 dias padrão).
* **Status de DPA:** `NOT_REVIEWED`.

### 2.5. Provedor de Pagamentos (Atualmente Simulado / Mock)
* **Status Atual:** **APENAS MOCK ATIVO** (`MockPaymentProvider`).
* **Invariante:** `REAL_PAYMENT_PROVIDER_INTEGRATED = false`.
* **Dados Pessoais Transmitidos:** **NENHUM**. Nenhum gateway de pagamento real está em operação no código. Eventos simulados utilizam UUIDs sintéticos em ambiente de desenvolvimento.
