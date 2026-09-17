const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envFile = path.join(__dirname, ".env");
const dataDir = path.join(__dirname, "data");
const subscriptionsFile = path.join(dataDir, "subscriptions.json");
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
};

if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
        }
    });
}

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(subscriptionsFile)) fs.writeFileSync(subscriptionsFile, "[]\n");

const plans = [
    {
        id: "gratuito",
        title: "Gratuito",
        price: "R$ 0,00",
        period: "para sempre",
        features: [
            "Perfil básico de artista",
            "1 prévia e 1 projeto fixado",
            "Presença nas categorias",
            "Links de Instagram, Spotify e YouTube",
            "Divulgação e pesquisa padrão",
        ],
    },
    {
        id: "premium",
        title: "Premium",
        price: "R$ 19,90",
        period: "/mês",
        badge: "Selo neon verificado",
        features: [
            "Mais destaque nas pesquisas",
            "Até 3 prévias e 3 projetos fixados",
            "Destaque por cidade, CEP e estado",
            "Números de cliques e visualizações",
            "Participação em seleções do site",
        ],
    },
    {
        id: "destaque",
        title: "Destaque",
        price: "R$ 9,90",
        period: "/7 dias",
        badge: "Temporário",
        features: [
            "Perfil destacado na categoria e região",
            "Impulso para lançamentos e eventos",
            "Visibilidade priorizada na página principal",
        ],
    },
    {
        id: "premium-anual",
        title: "Premium Anual",
        price: "R$ 199,90",
        period: "/ano",
        badge: "Melhor valor",
        savings: "Economize R$ 238,80 em relação a 12 mensalidades",
        features: [
            "Todas as vantagens do Premium",
            "Economia direta de R$ 238,80 por ano",
            "Pagamento via Pix ou cartão de débito",
        ],
    },
];

function readSubscriptions() {
    try {
        const value = JSON.parse(fs.readFileSync(subscriptionsFile, "utf8"));
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function writeSubscriptions(subscriptions) {
    fs.writeFileSync(subscriptionsFile, `${JSON.stringify(subscriptions, null, 2)}\n`);
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 10000) reject(new Error("Payload muito grande"));
        });
        request.on("end", () => {
            if (!body) return resolve({});
            try { resolve(JSON.parse(body)); } catch { reject(new Error("JSON inválido")); }
        });
        request.on("error", reject);
    });
}

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(body));
}

function serveFile(response, requestPath) {
    const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    let filePath = path.resolve(rootDir, relativePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
    }

    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        sendJson(response, 404, { error: "Arquivo não encontrado" });
        return;
    }

    response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (request.method === "OPTIONS") {
        sendJson(response, 204, {});
        return;
    }

    if (requestUrl.pathname === "/api/config") {
        sendJson(response, 200, {
            clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                || process.env.CLERK_PUBLISHABLE_KEY
                || null,
        });
        return;
    }

    if (requestUrl.pathname === "/api/test") {
        sendJson(response, 200, { ok: true });
        return;
    }

    if (requestUrl.pathname === "/api/usuario/status" && request.method === "GET") {
        sendJson(response, 200, { verificado: false });
        return;
    }

    if (requestUrl.pathname === "/api/catalog/plans" && request.method === "GET") {
        sendJson(response, 200, {
            plans,
            paymentMocked: true,
            pixKey: "trysl4035@gmail.com",
            recipientNotice: "Pagamentos destinados à pessoa física responsável pelo site: Isabela Ingrid Silva Costa (Trysla).",
        });
        return;
    }

    if (requestUrl.pathname === "/api/subscriptions" && request.method === "GET") {
        sendJson(response, 200, { subscriptions: readSubscriptions() });
        return;
    }

    if (requestUrl.pathname === "/api/subscriptions" && request.method === "POST") {
        readRequestBody(request).then((body) => {
            const plan = plans.find((item) => item.id === body.planId);
            const location = body.location || {};
            const allowedMethods = body.planId === "premium-anual" ? ["pix", "debit"] : ["pix", "debit"];
            if (!plan) return sendJson(response, 400, { error: "Plano inválido." });
            if (!allowedMethods.includes(body.paymentMethod)) return sendJson(response, 400, { error: "Método de pagamento inválido." });
            if (!String(location.cep || "").trim() || !String(location.cidade || "").trim() || !String(location.estado || "").trim()) {
                return sendJson(response, 400, { error: "Informe cidade, CEP e estado." });
            }

            const subscription = {
                id: `sub_${Date.now()}`,
                planId: plan.id,
                planTitle: plan.title,
                period: plan.period,
                status: "confirmed_mock",
                paymentMocked: true,
                paymentMethod: body.paymentMethod,
                location: {
                    cep: String(location.cep).trim().slice(0, 9),
                    cidade: String(location.cidade).trim().slice(0, 80),
                    estado: String(location.estado).trim().toUpperCase().slice(0, 2),
                },
                createdAt: new Date().toISOString(),
            };
            const subscriptions = readSubscriptions();
            subscriptions.push(subscription);
            writeSubscriptions(subscriptions);
            sendJson(response, 201, { subscription, message: "Assinatura MOCKADA confirmada." });
        }).catch((error) => sendJson(response, 400, { error: error.message || "Não foi possível salvar a assinatura." }));
        return;
    }

    serveFile(response, requestUrl.pathname);
});

server.listen(port, () => {
    console.log(`Servidor local em http://localhost:${port}`);
});
