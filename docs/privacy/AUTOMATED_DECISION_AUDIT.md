# Auditoria de Decisões Automatizadas — Velvet

> **Fase:** LGPD-01 — Data Inventory & Data Subject Rights Foundation  
> **Referência Legal:** LGPD Art. 20 (Decisões unicamente automatizadas)  
> **Status:** AUDITADO E CONSOLIDADO  

---

## 1. Visão Geral e Critérios Técnicos

O Artigo 20 da LGPD confere ao titular o direito de solicitar a revisão de decisões tomadas **unicamente com base em tratamento automatizado** de dados pessoais que afetem seus interesses.

Para a auditoria técnica, cada sistema do Velvet foi avaliado contra 3 critérios cumulativos:
1. O processamento baseia-se em **dados pessoais** do titular?
2. A decisão é **unicamente automatizada** (sem intervenção ou juízo humano no fluxo)?
3. A decisão produz **efeito jurídico ou impacto relevante** sobre os interesses do titular?

---

## 2. Avaliação dos Candidatos Técnicos

### 2.1. Moderação de Fotos e Vídeos de Perfil
* **Dados Pessoais Utilizados:** Sim (imagens e clipes de vídeo do anunciante).
* **Unicamente Automatizado?** **NÃO.**
* **Avaliação:** O Velvet opera um console de moderação onde cada foto ou vídeo é inspecionado e aprovado/rejeitado por um **moderador humano**. O sistema não possui modelo de visão computacional que tome a decisão terminativa de rejeição.
* **Qualificação sob Art. 20:** **NÃO SE APLICA.** Não é uma decisão unicamente automatizada.

### 2.2. Verificação de Identidade e Maioridade (Didit KYC) — **CANDIDATO QUALIFICADO**
* **Dados Pessoais Utilizados:** Sim (documento de identidade oficial e biometria facial).
* **Unicamente Automatizado?** **SIM.**
* **Efeito Relevante?** **SIM.** Se o algoritmo do Didit reprovar o documento ou a biometria, o anunciante é impedido de prosseguir no onboarding e de publicar anúncios no marketplace.
* **Qualificação sob Art. 20:** **QUALIFICAÇÃO TÉCNICA POSITIVA.**
* **Recomendação:** O Velvet deve manter suporte a `AUTOMATED_DECISION_REVIEW` para que o anunciante reprovado possa solicitar revisão humana manual por um operador da plataforma caso entenda que houve falso-positivo biométrico.

### 2.3. Algoritmo de Busca, Rotação Justa e Boosts
* **Dados Pessoais Utilizados:** Não (opera com base no nível comercial de boost adquirido e sementes determinísticas de rotação por cidade/horário).
* **Unicamente Automatizado?** Sim.
* **Efeito Relevante?** Não. Trata-se de ordenação comercial de vitrine, sem impacto sobre direitos civis, capacidade jurídica ou crédito.
* **Qualificação sob Art. 20:** **NÃO SE APLICA.**

### 2.4. Assistente Virtual AI Concierge
* **Dados Pessoais Utilizados:** Não (responde com base em fatos públicos do perfil cadastrados pelo anunciante).
* **Unicamente Automatizado?** Sim (LLM OpenAI).
* **Efeito Relevante?** Não. O assistente possui barreiras de segurança invioláveis que o impedem de confirmar reservas, receber pagamentos ou celebrar contratos.
* **Qualificação sob Art. 20:** **NÃO SE APLICA.**

### 2.5. Bloqueio por Limite de Taxa (Rate Limiting)
* **Dados Pessoais Utilizados:** Não (utiliza chaves HMAC temporárias de IPs pseudonimizados).
* **Unicamente Automatizado?** Sim.
* **Efeito Relevante?** Não. É um bloqueio técnico transitório (janela de 15 minutos com HTTP 429) para proteção cibernética contra negação de serviço.
* **Qualificação sob Art. 20:** **NÃO SE APLICA.**
