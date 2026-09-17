# Backend local

Copie `.env.example` para `.env`, substitua os valores pelas chaves do Clerk e inicie o servidor na raiz do projeto. O arquivo `.env` não deve ser versionado:

```powershell
Copy-Item backend/.env.example backend/.env
# Edite backend/.env e informe sua chave pública
node backend/server.js
```

A página do login usa `http://localhost:3000/api/config` durante o desenvolvimento.

O backend grava os dados em `backend/data` localmente. Para persistir verificações e dispositivos na Vercel, configure um banco Redis compatível com a API REST do Upstash:

```text
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Sem essas variáveis, o backend usa `/tmp/fora-do-site-data` na Vercel; esse diretório é temporário e pode ser apagado entre execuções.

Para confirmar novos dispositivos por e-mail, configure também no `backend/.env`:

```text
RESEND_API_KEY=re_...
SECURITY_EMAIL_FROM=seguranca@seu-dominio.com
```

Os dois primeiros dispositivos de cada conta são registrados como confiáveis. Um terceiro dispositivo fica bloqueado até o código enviado por e-mail ser confirmado. O endereço usado em `SECURITY_EMAIL_FROM` precisa estar autorizado no Resend.
