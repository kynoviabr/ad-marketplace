# Inventário de Operadores e Subprocessadores Externos — Velvet

> **Fase:** LGPD-01.1 — Privacy Inventory Closure  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Visão Geral

Este documento inventaria os subprocessadores e integrações externas confirmadas que recebem ou processam dados de usuários do Velvet.

*Aviso:* Nenhum valor de credencial ou chave de API está exposto. Somente identificadores de configuração e provedores presentes no repositório foram incluídos.

---

## 2. Inventário de Provedores Confirmados

### 2.1. Supabase Inc.
* **Status de Ativação:** `ACTIVE`
* **Função no Velvet:** Banco de dados em nuvem (PostgreSQL), serviço de autenticação (`auth.users`), buckets de armazenamento de mídia (`profile-media`, `profile-videos`), gateway de API PostgREST.
* **Categorias de Dados Transmitidos:** Credenciais, e-mails, dados de perfis, fotos, vídeos, trilhas de auditoria e telemetria.
* **Identificadores Transmitidos:** E-mails, telefones, UUIDs internos de titular, IP de transporte.
* **Armazenamento Local Velvet:** Armazenamento operacional completo em tabelas Postgres e buckets Supabase Storage.
* **Processamento no Operador:** Gestão de banco de dados, criptografia em repouso, controles de acesso IAM, CDN de armazenamento.
* **Transferência Internacional de Dados:** `POSSIBLE`. Instância de banco de dados na região AWS `sa-east-1` (São Paulo, Brasil); operadora Supabase Inc. sob jurisdição de Delaware (EUA). Acesso operacional remoto e rotinas de backup podem configurar transferência internacional.
* **Comportamento de Retenção Externa:** `KNOWN`.
* **Capacidade de Exclusão:** `SUPPORTED` via API administrativa (`deleteUser()`, `remove()` em Storage, rotinas SQL).
* **Status de DPA (Data Processing Agreement):** `NOT_REVIEWED` (A ser formalizado na contratação de produção).

### 2.2. Vercel Inc.
* **Status de Ativação:** `ACTIVE`
* **Função no Velvet:** Hospedagem de frontend, execução de Serverless Functions / Server Actions, CDN global de borda (Edge Network).
* **Categorias de Dados Transmitidos:** Cabeçalhos HTTP efêmeros, cookies de sessão (`sb-...`, `velvet_cookie_consent`), parâmetros de Server Actions.
* **Identificadores Transmitidos:** Endereços IP dos clientes na camada de borda, cabeçalhos User-Agent, cookies de autenticação em trânsito.
* **Armazenamento Local Velvet:** Sem persistência em banco; cache de borda efêmero.
* **Processamento no Operador:** Roteamento de tráfego, cache de borda, logs de execução de funções serverless, mitigação de DDoS.
* **Transferência Internacional de Dados:** `YES`. Rede de borda global com execução principal de funções serverless em nós nos Estados Unidos / Américas.
* **Comportamento de Retenção Externa:** `KNOWN` (Retenção temporária padrão de logs de acesso da Vercel).
* **Capacidade de Exclusão:** `MANUAL_ONLY`.
* **Status de DPA:** `NOT_REVIEWED`.

### 2.3. Didit (Didit Verification)
* **Status de Ativação:** `ACTIVE`
* **Função no Velvet:** Validação automatizada de documentos de identificação oficial, cálculo de maioridade (18+), e biometria facial (liveness check).
* **Categorias de Dados Transmitidos:** Solicitação de abertura de sessão de verificação vinculando o `account_user_id` do anunciante no campo `vendor_data`. O Velvet **não envia** nome civil ou e-mail na chamada de sessão.
* **Identificadores Transmitidos:** `vendor_data` (`account_user_id` em UUID).
* **Armazenamento Local Velvet:** Somente flags de desfecho (`status`, `age_verified`, `identity_verified`, `cpf_verified`), `provider_session_id` e eventos de recebimento de webhook. **Zero imagens de documentos, zero selfies e zero vetores biométricos são persistidos no banco do Velvet.**
* **Processamento no Operador (Didit):** Extração de template biométrico facial, análise de vídeo de vivacidade (liveness), OCR de documentos de identidade, validação em bases governamentais.
* **Comportamento de Retenção Externa:** `LEGAL_CONTRACT_REVIEW_REQUIRED`. Políticas exatas de descarte de fotos/vídeos e retenção de auditoria no fornecedor dependem de revisão formal de contrato e termos de serviço.
* **Transferência Internacional de Dados:** `YES`. Infraestrutura da Didit localizada na União Europeia (Espanha).
* **Capacidade de Exclusão Externa:** `UNKNOWN`. Propagação de DSR erasure requer implementação e validação de endpoints na API Didit.
* **Status de DPA:** `NOT_REVIEWED`.

### 2.4. OpenAI, L.L.C. (Estagiado / Desativado)
* **Status de Ativação:** `CONFIGURED_BUT_DISABLED`
* **Função no Velvet:** Geração de linguagem natural para o assistente virtual AI Concierge.
* **Status Atual:** Bloqueado via flags `CONCIERGE_WEB_PUBLIC_ENABLED=false` e `CONCIERGE_RETENTION_POLICY_APPROVED=false`. Sem tráfego público ativo.
* **Categorias de Dados Transmitidos (Quando ativo):** Mensagens do visitante; fatos públicos do perfil (preços, serviços, horários, FAQs).
* **Identificadores Transmitidos:** Nenhum identificador de conta ou e-mail é enviado no prompt.
* **Armazenamento Local Velvet:** Mensagens e conversas do concierge (em estágio).
* **Processamento no Operador:** Embeddings e inferência de modelos LLM.
* **Comportamento de Retenção Externa:** `KNOWN` (OpenAI retém dados de API por 30 dias para controle de abuso por padrão).
* **Transferência Internacional de Dados:** `YES`. Servidores da OpenAI nos Estados Unidos.
* **Capacidade de Exclusão:** `SUPPORTED`.
* **Status de DPA:** `NOT_REVIEWED`.

### 2.5. Provedor de Pagamentos (Atualmente Simulado / Mock)
* **Status de Ativação:** `MOCK_ONLY`
* **Função no Velvet:** Simulador de transações para testes de assinatura e boost. `REAL_PAYMENT_PROVIDER_INTEGRATED = false`.
* **Categorias de Dados Transmitidos:** Nenhuma. Opera puramente em memória / processo local.
* **Identificadores Transmitidos:** Nenhum.
* **Armazenamento Local Velvet:** IDs sintéticos de transações mock em `billing_webhook_events`.
* **Processamento no Operador:** Nenhum. Não há gateway de pagamentos real em operação.
* **Transferência Internacional de Dados:** `NO`.
* **Capacidade de Exclusão:** `NOT_APPLICABLE`.
* **Status de DPA:** `NOT_REVIEWED`.

### 2.6. Meta / WhatsApp (Links Client-side / Planejado)
* **Status de Ativação:** `PLANNED`
* **Função no Velvet:** Abertura de conversa pelo navegador do cliente via links `wa.me/<telefone>`.
* **Categorias de Dados Transmitidos:** Nenhuma a partir dos servidores do Velvet.
* **Identificadores Transmitidos:** Nenhum a partir do backend.
* **Armazenamento Local Velvet:** Telefone informado pela profissional em `professional_profiles` com consentimento para exibição pública.
* **Processamento no Operador:** Nenhum no backend. Comunicação direta peer-to-peer no cliente do WhatsApp.
* **Transferência Internacional de Dados:** `NO` (a partir do backend).
* **Capacidade de Exclusão:** `NOT_APPLICABLE`.
* **Status de DPA:** `NOT_REVIEWED`.
