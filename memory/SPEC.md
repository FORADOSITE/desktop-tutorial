# FORA DO SITE — Especificação viva

## O que o app faz

Site de apresentação e cadastro de artistas/profissionais culturais, com editor de perfil e catálogo pós-verificação documental para escolher a visibilidade do perfil.

## Fluxo principal

1. A pessoa acessa o login/cadastro existente.
2. A etapa demonstrativa de verificação documental confirma o fluxo.
3. O catálogo apresenta Gratuito, Premium mensal, Destaque por 7 dias e Premium Anual.
4. A pessoa escolhe o plano, informa cidade, CEP e estado, escolhe Pix ou débito e confirma.
5. A assinatura é salva no backend com status `confirmed_mock`; a UI informa que o processamento é MOCKADO.
6. O perfil lê a assinatura salva, mostra o selo Premium e aplica limite de 1 prévia no Gratuito ou 3 no Premium.

## Planos

- Gratuito: perfil básico, 1 prévia, 1 projeto fixado, categorias, links sociais e pesquisa/divulgação padrão.
- Premium: R$ 19,90/mês, selo neon, até 3 prévias/projetos, alcance regional e métricas numéricas anonimizadas.
- Destaque: R$ 9,90/7 dias, destaque temporário por categoria/região.
- Premium Anual: R$ 199,90/ano, mesmas vantagens do Premium e economia explícita de R$ 238,80.

## Backend e dados

- API pública em `/api/catalog/plans`, `/api/subscriptions` e `/api/usuario/status`.
- Assinaturas são persistidas em `backend/data/subscriptions.json`.
- Registro salvo: plano, período, status, método, localização e timestamp.
- Número de cartão, validade, CVV e CPF nunca são enviados nem persistidos.
- A assinatura ativa é recuperada por ID em `/api/subscriptions/{id}` para configurar o editor de perfil.

## Auth e verificação

O Clerk fornece cadastro e login usando chaves carregadas apenas no backend; `/api/config` entrega somente a chave publicável. A tela de verificação e o catálogo permanecem acessíveis no preview; não há integração real de verificação documental ou cobrança.

## Conta proprietária

- A conta Clerk de `isbingsc@gmail.com` recebe Premium Anual permanente e gratuito.
- O benefício é conferido no backend usando a sessão Clerk e nunca solicita pagamento.
- O plano libera selo Premium e até 3 prévias no perfil.

## Estado de integração

**PAGAMENTO MOCKADO**: Pix e cartão de débito são apenas opções de interface; nenhum provedor ou cobrança real está conectado.