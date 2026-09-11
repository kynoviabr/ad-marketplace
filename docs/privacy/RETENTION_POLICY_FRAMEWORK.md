# Estrutura da Política de Retenção de Dados — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Status:** DRAFT (Rascunho de Engenharia) — PENDENTE DE APROVAÇÃO JURÍDICA  

---

## 1. Aviso Fundamental de Governança

Em estrito cumprimento das diretrizes de engenharia de privacidade:
* **Nenhum prazo de retenção está aprovado em caráter final.**
* Todos os períodos aqui documentados constituem **propostas técnicas preliminares** baseadas na legislação brasileira correlata (ECA, Código Civil, Marco Civil da Internet, CTN).
* **Nenhum job ou rotina de expurgo automático foi ativado na Fase LGPD-01.**
* A aprovação final de prazos e bases legais depende de parecer conclusivo do encarregado de dados (DPO) e assessoria jurídica.

---

## 2. Prazos Propostos para Avaliação Jurídica

| Categoria | Prazo Proposto | Gatilho Temporal | Base Legal Sugerida | Status Atual |
| :--- | :--- | :--- | :--- | :--- |
| **Credenciais e Contas** | 0 a 30 dias | Aprovação formal de solicitação de exclusão do titular | LGPD Art. 16 (Eliminação) | `DRAFT / TO_BE_REVIEWED` |
| **Verificação de Identidade (KYC)** | 5 anos | Encerramento da conta de anunciante | ECA Art. 240-241; LGPD Art. 16, I (Cumprimento de obrigação legal) | `DRAFT / LEGAL_APPROVAL_REQUIRED` |
| **Fotos e Vídeos de Perfil** | Exclusão imediata (arquivos físicos em até 24h) | Solicitação de exclusão ou expiração definitiva | LGPD Art. 16 | `DRAFT / TO_BE_REVIEWED` |
| **Assinaturas e Transações Fiscais** | 5 anos | Emissão da fatura / data da transação comercial | Código Tributário Nacional Art. 174; Código Civil Art. 206, §5º | `DRAFT / LEGAL_APPROVAL_REQUIRED` |
| **Auditoria de Moderação e Takedowns** | 3 anos | Timestamp da decisão de moderação | Marco Civil da Internet Art. 19; LGPD Art. 16, II | `DRAFT / LEGAL_APPROVAL_REQUIRED` |
| **Telemetria e Logs Analíticos** | 6 meses (eventos brutos); Indefinido (métricas agregadas) | Criação do evento analítico | Marco Civil da Internet Art. 15 (Logs de aplicação); LGPD Art. 12 | `DRAFT / TO_BE_REVIEWED` |
| **Mensagens do AI Concierge** | 90 dias | Fechamento da sessão de conversa | LGPD Art. 16 | `DRAFT / LEGAL_APPROVAL_REQUIRED` |
| **Histórico de Solicitações LGPD** | 5 anos | Data de resolução da solicitação DSR | LGPD Art. 18 e 19; Obrigação legal de comprovação | `DRAFT / LEGAL_APPROVAL_REQUIRED` |
