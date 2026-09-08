const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const routes = require("./routes");

function carregarEnvLocal() {
  if (process.env.NODE_ENV === "production") return;

  const envPath = path.join(__dirname, "..", "api", ".env");
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const [name, ...parts] = line.trim().split("=");
    if (name && parts.length && !process.env[name]) {
      process.env[name] = parts.join("=").replace(/^['"]|['"]$/g, "");
    }
  });
}

carregarEnvLocal();
const app = express();
// Em ambientes serverless (Vercel) não usamos `app.listen`.
const frontEndDir = path.join(__dirname, "..", "front-end");

app.use(express.json());
app.use(cors());
app.get("/api/config", (_req, res) => {
  res.json({ clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || null });
});
app.use("/api", routes);
// A Vercel pode remover o prefixo /api antes de encaminhar a requisição à função.
app.use("/", routes);

// Serve o front-end na raiz
app.use(express.static(frontEndDir));
// Também expõe o front-end sob o prefixo /front-end para corresponder ao comportamento do deploy (vercel.json)
app.use('/front-end', express.static(frontEndDir));
app.use('/termos-de-uso', express.static(path.join(frontEndDir, 'intro', 'termos de uso')));
app.use('/politica-de-privacidade', express.static(path.join(frontEndDir, 'intro', 'politica de privacidade')));
app.get('/termos-de-uso/termosdeuso.html', (_req, res) => {
  res.sendFile(path.join(frontEndDir, 'intro', 'termos de uso', 'termosdeuso.html'));
});
app.get('/politica-de-privacidade/politicadeprivacidade.html', (_req, res) => {
  res.sendFile(path.join(frontEndDir, 'intro', 'politica de privacidade', 'politicadeprivacidade.html'));
});
app.get("/", (_req, res) => {
  res.redirect("/front-end/intro/index.html");
});

// Compatibilidade extra: redireciona pedidos errados como /front-end/index/index.html
app.get('/front-end/index/index.html', (_req, res) => {
  res.redirect('/front-end/intro/index.html');
});





app.get("/api/test", (req, res) => {
  res.json({ ok: true });
});

app.get("/test", (req, res) => {
  res.json({ ok: true });
});

module.exports = app;

// Quando executado diretamente (`node api/server.js`) iniciamos o servidor para desenvolvimento.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor de desenvolvimento rodando em http://localhost:${port}`);
  });
}