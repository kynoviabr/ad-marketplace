# Decisões Jurídicas Pendentes — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Destinatário:** Encarregado de Dados (DPO) e Assessoria Jurídica  
> **Status:** AGUARDANDO DELIBERAÇÃO FORMAL  

---

## 1. Visão Geral

A arquitetura técnica da Fase LGPD-01 estabelece a infraestrutura de dados e governança sem presumir conclusões jurídicas finais. As questões a seguir necessitam de posicionamento conclusivo da equipe jurídica antes da ativação de rotinas de expurgo na Fase LGPD-02:

---

## 2. Pauta de Decisões

### Decisão Jurídica 01: Prazo de Guarda dos Registros de KYC e Maioridade
* **Contexto:** O Velvet verifica a maioridade (18+) dos anunciantes através do provedor Didit.
* **Proposta da Engenharia:** Retenção do status e comprovante de verificação por **5 anos** após o encerramento da conta, com base no ECA (Art. 240-241) e prescrição civil geral.
* **Ponto de Deliberação:** O departamento jurídico aprova o prazo de 5 anos ou recomenda prazo distinto (ex: 3 anos ou 10 anos)?

### Decisão Jurídica 02: Tratamento de Avaliações de Clientes em Pedido de Exclusão
* **Contexto:** Se um cliente solicitar a eliminação completa de seus dados pessoais (`DELETION`), a exclusão física de suas avaliações alteraria a nota média histórica dos profissionais avaliados.
* **Proposta da Engenharia:** Anonimização irreversível da avaliação (remoção do texto do comentário e desvinculação da chave do cliente), mantendo a nota numérica agregada para fins estatísticos legítimos da plataforma.
* **Ponto de Deliberação:** Confirmação jurídica de que a anonimização de avaliações atende integralmente ao Art. 16 da LGPD sem configurar retenção indevida de dados pessoais.

### Decisão Jurídica 03: Formalização de DPAs com Subprocessadores Internacionais
* **Contexto:** Os dados trafegam por três operadores sediados no exterior ou com nuvem internacional: Supabase Inc. (EUA), Vercel Inc. (EUA) e Didit (Espanha / UE).
* **Ponto de Deliberação:** Formalização de Aditivos de Processamento de Dados (DPA / Cláusulas-Padrão Contratuais da ANPD) com cada fornecedor para atender às exigências de Transferência Internacional de Dados (LGPD Art. 33).

### Decisão Jurídica 04: Política de Retenção de Mensagens do AI Concierge
* **Contexto:** O módulo de chat assistivo registra mensagens trocadas entre visitantes e assistente virtual.
* **Proposta da Engenharia:** Retenção temporária por **90 dias** para controle de qualidade e aprimoramento de respostas, seguida de descarte automático.
* **Ponto de Deliberação:** O prazo de 90 dias é considerado juridicamente proporcional para dados de visitantes antes do lançamento público do assistente?
