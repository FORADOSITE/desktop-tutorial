# FORA DO SITE

Plataforma de perfis para artistas e profissionais da cultura, com autenticação Clerk, catálogo de planos e editor de perfil.

## Executar localmente

Requisitos: Python 3.11+ e Yarn.

Na primeira execução, instale as dependências:

```bash
yarn setup
```

Depois, inicie site e API juntos com um único comando:

```bash
yarn dev
```

Acesse **http://localhost:3000**. O mesmo servidor entrega as páginas e todas as rotas `/api`.

> Não abra os HTMLs com `file://` e não use Live Server: essas opções não iniciam a API e causam `ERR_CONNECTION_REFUSED` em `/api/config`.

## Configuração local

Crie `backend/.env` a partir de `backend/.env.example` e preencha as chaves Clerk. O arquivo real é ignorado pelo Git e nunca deve ser publicado.

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
OWNER_EMAIL=seu-email@exemplo.com
APP_URL=http://localhost:3000
```

## Rotas principais

- Cadastro/login: `/front-end/login/index.html?cadastro=1`
- Verificação: `/front-end/verificacao-documento/index.html`
- Catálogo: `/front-end/catalogo/index.html`
- Perfil: `/front-end/perfil/index.html`
- Configuração pública: `/api/config`

## Teste rápido

Com `yarn dev` ativo:

```bash
curl http://localhost:3000/api/config
```

A resposta deve conter apenas `clerkPublishableKey`; a chave secreta nunca é enviada ao navegador.
