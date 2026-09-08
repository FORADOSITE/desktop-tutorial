# Backend local

Copie `.env.example` para `.env`, substitua os valores pelas chaves do Clerk e inicie o servidor na raiz do projeto. O arquivo `.env` não deve ser versionado:

```powershell
Copy-Item backend/.env.example backend/.env
# Edite backend/.env e informe sua chave pública
node backend/server.js
```

A página do login usa `http://localhost:3000/api/config` durante o desenvolvimento.
