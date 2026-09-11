# Decisões Jurídicas Pendentes — Velvet

> **Fase:** LGPD-01.1 — Privacy Inventory Closure  
> **Destinatário:** Encarregado de Proteção de Dados (DPO) e Assessoria Jurídica  
> **Status:** AGUARDANDO DELIBERAÇÃO FORMAL  

---

## 1. Visão Geral

A arquitetura técnica da Fase LGPD-01.1 estabelece a infraestrutura de dados e governança sem presumir conclusões jurídicas finais. Em estrita conformidade com as diretrizes do projeto:
* A engenharia **não estipula prazos legais de retenção** como presumidamente corretos.
* Todos os prazos de ciclo de vida permanecem tecnicamente configurados como:
  **`RETENTION PERIOD = UNDEFINED (LEGAL REVIEW REQUIRED)`**
* As questões a seguir necessitam de posicionamento conclusivo da equipe jurídica antes da implementação de qualquer rotina na Fase LGPD-02:

---

## 2. Pauta de Decisões

### Decisão Jurídica 01: Definição do Prazo Legal de Guarda dos Registros de KYC e Maioridade (18+)
* **Contexto:** O Velvet verifica a maioridade (18+) dos anunciantes através do provedor Didit. O banco local armazena flags booleanas (`age_verified: true`, `identity_verified: true`) e o ID da sessão de verificação.
* **Dependência Técnica:** A engenharia necessita do prazo exato de retenção exigido para cumprimento de obrigação legal e proteção contra alegações de veiculação de menores (considerando o ECA e a prescrição civil/penal geral).
* **Ponto de Deliberação:** Qual o prazo legal mandatório (ou recomendável) que a plataforma deve reter o registro histórico de que o anunciante foi verificado como maior de 18 anos após a desativação ou encerramento da conta?

### Decisão Jurídica 02: Tratamento de Avaliações de Clientes em Pedido de Exclusão (DSR)
* **Contexto:** Se um cliente solicitar a eliminação completa de seus dados pessoais (`DELETION`), a exclusão física de suas avaliações alteraria a nota média histórica dos profissionais avaliados.
* **Hipótese Técnica Submetida:** Anonimização irreversível da avaliação (remoção do texto do comentário e desvinculação da chave do cliente), mantendo a nota numérica agregada para fins estatísticos legítimos da plataforma.
* **Ponto de Deliberação:** Confirmação jurídica de que a anonimização de avaliações atende integralmente ao Art. 16 da LGPD sem configurar retenção indevida de dados pessoais.

### Decisão Jurídica 03: Formalização de DPAs com Subprocessadores Internacionais
* **Contexto:** Os dados trafegam por três operadores com instâncias ou entidades no exterior: Supabase Inc. (banco em AWS sa-east-1 SP / sede EUA), Vercel Inc. (EUA / CDN global) e Didit (Espanha / UE).
* **Ponto de Deliberação:** Formalização de Aditivos de Processamento de Dados (DPA / Cláusulas-Padrão Contratuais da ANPD) com cada fornecedor para atender às exigências de Transferência Internacional de Dados (LGPD Art. 33).

### Decisão Jurídica 04: Política de Retenção de Mensagens do AI Concierge
* **Contexto:** O módulo de chat assistivo registra mensagens trocadas entre visitantes e assistente virtual (atualmente desativado via feature flag).
* **Dependência Técnica:** A funcionalidade de chat só será liberada para produção após definição da política de retenção e aprovação formal de sua base legal.
* **Ponto de Deliberação:** Qual o prazo de guarda e descarte admitido para conversas de concierge com visitantes não cadastrados antes do lançamento do assistente?

### Decisão Jurídica 05: Classificação de Ensaios Fotográficos Adultos
* **Contexto:** Imagens e vídeos armazenados nos buckets privados do Supabase contêm ensaios sensuais de anunciantes adultos.
* **Classificação Técnica:** Classificado pela engenharia como `HIGH_RISK_BUT_NOT_CLASSIFIED_AS_SENSITIVE` (dado de alto risco à intimidade, mas distinto do rol estrito do Art. 5º, II até manifestação jurídica).
* **Ponto de Deliberação:** O departamento jurídico entende que o acervo fotográfico de anunciantes deve ser tratado formalmente sob o regime de dados sensíveis (Art. 11) ou como dado pessoal comum de alto risco com medidas reforçadas de segurança técnica?
