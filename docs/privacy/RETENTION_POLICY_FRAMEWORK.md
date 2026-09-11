# Estrutura da Política de Retenção de Dados — Velvet

> **Fase:** LGPD-01.1 — Privacy Inventory Closure  
> **Status:** UNDEFINED / DRAFT (Rascunho Técnico) — REVISÃO JURÍDICA OBRIGATÓRIA  

---

## 1. Aviso Fundamental de Governança

Em estrito cumprimento das diretrizes de engenharia de privacidade e LGPD:
* **NENHUM PRAZO DE RETENÇÃO ESTÁ DEFINIDO OU APROVADO.**
* A engenharia **NÃO propõe nem fixa prazos legais presumidos** (incluindo menções a "5 anos sob ECA" ou similares).
* Todos os prazos de retenção de produção permanecem categorizados como:
  **`RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)`**
* **Nenhum job ou rotina de expurgo/deleção destrutiva automática está ativo.**
* A definição formal de prazos e bases legais depende exclusivamente de decisão jurídica formal e parecer do Encarregado de Proteção de Dados (DPO).

---

## 2. Matriz Técnica de Governança de Retenção

| Categoria | Prazo de Retenção | Gatilho Temporal Técnico | Dependência Jurídica / Referência | Status de Retenção |
| :--- | :--- | :--- | :--- | :--- |
| **Credenciais e Contas** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Aprovação formal de solicitação de exclusão do titular | LGPD Art. 16 (Eliminação) | `UNDEFINED` |
| **Verificação de Identidade (KYC)** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Encerramento da conta de anunciante | Defesa em matéria de maioridade (18+); ECA Art. 240-241; LGPD Art. 16, I | `UNDEFINED` |
| **Fotos e Vídeos de Perfil** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Desativação, expiração ou solicitação aprovada | Despublicação imediata; ciclo de descarte em storage sob definição | `UNDEFINED` |
| **Assinaturas e Transações Comerciais** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Emissão da fatura / data da transação | Prazo prescricional fiscal/civil (CTN / Código Civil) | `UNDEFINED` |
| **Auditoria de Moderação e Takedowns** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Timestamp da decisão operacional de moderação | Defesa de direitos e safe harbor (Marco Civil da Internet Art. 19; LGPD Art. 16, II) | `UNDEFINED` |
| **Telemetria e Logs Analíticos** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Criação do evento analítico | Marco Civil Art. 15; anonimização sob LGPD Art. 12 | `UNDEFINED` |
| **Mensagens do AI Concierge** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Encerramento da conversa (recurso estagiado/desativado) | LGPD Art. 16 | `UNDEFINED` |
| **Histórico de Solicitações LGPD (DSR)** | `UNDEFINED` (Revisão Jurídica Obrigatória) | Resolução formal da solicitação DSR | LGPD Art. 16, I; comprovação de cumprimento regulatório perante ANPD | `UNDEFINED` |

---

## 3. Perguntas e Dependências Técnicas para o Jurídico

1. **KYC e Maioridade:** Qual o prazo legal obrigatório que a plataforma deve reter evidências de que o anunciante era maior de 18 anos no momento da publicação?
2. **Dados Comerciais:** Como dissociar os registros de auditoria fiscal e contábil das contas operacionais após um pedido de exclusão de dados pessoais?
3. **Logs de Aplicação:** Qual a janela estrita de guarda de logs sob o Marco Civil da Internet (Art. 15) vs necessidade de descarte sob LGPD?
