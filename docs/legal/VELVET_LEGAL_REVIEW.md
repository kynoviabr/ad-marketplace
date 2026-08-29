# Velvet — revisão jurídica pendente

Este documento registra pontos que exigem confirmação de assessoria jurídica brasileira antes da publicação definitiva. Não é exibido no site.

## Identificação e contato

- Definir a pessoa jurídica controladora, nome empresarial, CNPJ e endereço.
- Configurar `PRIVACY_CONTACT_EMAIL` e definir se haverá canal institucional adicional.
- Confirmar a necessidade, identidade e forma de divulgação do encarregado/DPO.

## Privacidade e LGPD

- Mapear e confirmar bases legais por operação, em especial KYC, maioridade, possível biometria, moderação, prevenção de fraude e analytics.
- Concluir inventário de operadores e suboperadores, regiões de processamento e contratos/DPA de Supabase, Didit e hospedagem.
- Avaliar transferências internacionais e os mecanismos exigidos pela Resolução CD/ANPD nº 19/2024.
- Formalizar tabela de retenção, descarte, anonimização e legal hold para conta, KYC, webhooks, mídia, moderação, denúncias, analytics, logs e billing.
- Definir procedimento, autenticação do solicitante, prazos e responsáveis para direitos dos titulares.
- Avaliar necessidade de RIPD para verificação de identidade/idade e outros tratamentos de maior risco.
- Confirmar classificação e salvaguardas para dados biométricos tratados pelo fornecedor de KYC.
- Auditar configuração efetiva dos cookies de autenticação do Supabase e documentar nomes, duração e finalidade.
- Confirmar se analytics próprio em `sessionStorage`, autenticação e futura observabilidade exigem consentimento/CMP no cenário final. Não há CMP ou banner implementado.

## Produto e operação

- Definir e implementar encerramento/exclusão de conta e fluxo de despublicação associado; hoje não há autosserviço integral.
- Revisar posicionamento adulto 18+, riscos regulatórios do marketplace e regras de publicidade aplicáveis.
- Validar regras de conteúdo, moderação, denúncia, quarentena, recurso e comunicação às usuárias.
- Confirmar obrigações relativas a conteúdo ilegal e interação com autoridades.
- Validar a licença limitada de mídia e o tratamento após retirada, encerramento ou disputa.

## Termos comerciais

- Revisar papel de plataforma independente e limites de responsabilidade à luz do CDC e demais normas aplicáveis.
- Definir foro competente sem restringir direitos obrigatórios do consumidor.
- Definir fornecedor de pagamento aprovado, termos de assinatura, renovação, cancelamento, inadimplência, reembolso, tributos e emissão fiscal.
- Validar underwriting e contratos do provedor para a categoria de negócio antes de habilitar cobrança real.

## Versão e governança

- Harmonizar as versões legais gravadas no cadastro com as versões efetivamente publicadas.
- Definir processo de revisão, data de vigência, histórico, comunicação e reaceite em mudanças materiais.
- Fazer revisão jurídica integral da redação pública de `/privacidade`, `/termos` e `/seguranca`.
