# Plano de Implementação da Fase LGPD-02 — Velvet

> **Fase Anterior:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Próxima Fase:** LGPD-02 — Privacy Execution Engine & Lifecycles  
> **Status:** PLANEJADO  

---

## 1. Escopo da Fase LGPD-02

A Fase LGPD-02 construirá o **motor de execução do ciclo de vida dos dados pessoais** sobre a fundação estabelecida na Fase LGPD-01.

---

## 2. Itens do Backlog Técnico da Fase LGPD-02

### 2.1. Motor de Exportação de Dados do Titular (Data Portability Engine)
* **Objetivo:** Cumprir solicitações do tipo `ACCESS` e `PORTABILITY` gerando um pacote estruturado em formato JSON padronizado e legível por máquina.
* **Tarefas de Engenharia:**
  1. Implementar o gerador de DTO de exportação compilando:
     * Dados de conta (`account_users`);
     * Histórico de aceites legais;
     * Perfil profissional e bairros atendidos;
     * Metadados de fotos e vídeos;
     * Histórico de assinaturas e faturas;
     * Avaliações enviadas (se cliente);
     * Histórico de solicitações DSR e eventos.
  2. Implementar barreira estrita de exclusão:
     * Garantir que senhas, segredos, logs de moderação interna e dados de terceiros jamais constem no pacote exportado.
  3. Criar ação de download autenticada com link temporário seguro.

### 2.2. Motor de Exclusão e Anonimização Coordenada (Erasure Engine)
* **Objetivo:** Executar solicitações do tipo `DELETION` aprovadas por administradores ou solicitadas por titulares verificados.
* **Tarefas de Engenharia:**
  1. Orquestração de exclusão em dois estágios:
     * **Estágio 1 (Armazenamento Físico):** Coletar todos os caminhos em `profile_media` e `profile_videos`, e invocar `supabase.storage.from(...).remove(paths)` para purgar fisicamente as imagens e vídeos dos buckets privados.
     * **Estágio 2 (Banco de Dados Relacional):** Executar transação atômica que:
       - Desvincula ou anonimiza avaliações (`professional_reviews`);
       - Preserva registros com obrigação de retenção legal (KYC, faturas fiscais) marcando a conta como arquivada/excluída;
       - Remove a conta em `account_users` e `auth.users`.
  2. Propagação externa para Didit: disparar requisição de deleção de sessão via API do fornecedor.

### 2.3. Painel do Titular: "Privacidade e Meus Dados"
* **Objetivo:** Interface de autoatendimento contida no dashboard e na área do cliente.
* **Componentes:**
  1. Exibição das solicitações ativas e concluídas (`getMyDataSubjectRequestsAction`);
  2. Formulário de abertura de solicitação com seleção de direito (Acesso, Correção, Exportação, Exclusão, Revisão Automatizada);
  3. Alerta claro e confirmação em duas etapas para pedidos de exclusão de conta.

### 2.4. Fluxo Operacional de Atendimento para Administradores
* **Objetivo:** Permitir que operadores de privacidade transicionem os status dos chamados no console administrativo (`RECEIVED` -> `IN_REVIEW` -> `PROCESSING` -> `COMPLETED` / `REJECTED`).
* **Componentes:**
  1. Gravação de pareceres internos no campo `resolution_notes`;
  2. Registro automático de cada transição na tabela imutável `data_subject_request_events`.
