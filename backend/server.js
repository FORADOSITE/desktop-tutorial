const http = require("http");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require("@clerk/backend");

const rootDir = path.resolve(__dirname, "..");
const envFile = path.join(__dirname, ".env");
const profilesFile = path.join(__dirname, "data", "profiles.json");
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

const port = Number(process.env.PORT || 3000);

function sendJson(response, statusCode, body) {
    setSecurityHeaders(response);
    if (response.allowedOrigin) response.setHeader("Access-Control-Allow-Origin", response.allowedOrigin);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.statusCode = statusCode;
    response.end(JSON.stringify(body));
}

function setSecurityHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function serveFile(response, requestPath) {
    const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    let filePath = path.resolve(rootDir, relativePath);
    const rootPrefix = `${rootDir}${path.sep}`;
    const blockedPath = /(^|[\\/])(?:\.env(?:\.|$)|\.git(?:[\\/]|$)|\.vercel(?:[\\/]|$))/i.test(relativePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
    }

    if (blockedPath || !filePath.startsWith(rootPrefix) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        sendJson(response, 404, { error: "Arquivo não encontrado" });
        return;
    }

    setSecurityHeaders(response);
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
}

const localVerifiedUsers = new Set();
const acceptedDocumentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadFeaturedProfiles() {
    try {
        const profiles = JSON.parse(fs.readFileSync(profilesFile, "utf8"));
        return Array.isArray(profiles) ? profiles : [];
    } catch {
        return [];
    }
}

function saveFeaturedProfile(profile) {
    const profiles = loadFeaturedProfiles();
    const normalizedName = normalizeName(profile.nome);
    const existingIndex = profiles.findIndex((item) => normalizeName(item.nome) === normalizedName);
    const existingProfile = existingIndex === -1 ? null : profiles[existingIndex];
    const savedProfile = {
        nome: String(profile.nome).trim().slice(0, 80),
        slug: normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        titulo: String(profile.titulo || "Artista independente").trim().slice(0, 90),
        bio: String(profile.bio || "").trim().slice(0, 600),
        categoria: String(profile.categoria || existingProfile?.categoria || "Música").trim().slice(0, 40),
        tipo: String(profile.tipo || existingProfile?.tipo || "Artista").trim().slice(0, 40),
        acessos: Number.isFinite(Number(profile.acessos)) ? Number(profile.acessos) : Number(existingProfile?.acessos || 0),
        image_perfil: typeof profile.image_perfil === "string" && profile.image_perfil.startsWith("data:image/")
            ? profile.image_perfil.slice(0, 8 * 1024 * 1024)
            : null,
        ativo: profile.ativo === true,
    };
    if (existingIndex === -1) profiles.push(savedProfile);
    else profiles[existingIndex] = savedProfile;
    fs.mkdirSync(path.dirname(profilesFile), { recursive: true });
    fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2));
    return savedProfile;
}

function incrementFeaturedProfileAccess(slug) {
    const profiles = loadFeaturedProfiles();
    const profile = profiles.find((item) => item.slug === slug);
    if (!profile) return null;
    profile.acessos = Number(profile.acessos || 0) + 1;
    fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2));
    return profile;
}

async function getAuthenticatedUserId(authorization) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token || !process.env.CLERK_SECRET_KEY) return null;

    try {
        const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        return claims.sub || null;
    } catch (error) {
        console.error("Falha ao validar token Clerk:", error.message);
        return null;
    }
}

function isAdult(dateValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;
    const birthDate = new Date(`${dateValue}T00:00:00Z`);
    if (Number.isNaN(birthDate.getTime())) return false;

    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const birthdayPending = today.getUTCMonth() < birthDate.getUTCMonth()
        || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
    if (birthdayPending) age -= 1;
    return age >= 18;
}

function normalizeName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function hasValidImageSignature(file) {
    if (!file || !acceptedDocumentTypes.has(file.contentType) || file.data.length > 5 * 1024 * 1024) return false;
    if (file.contentType === "image/jpeg") return file.data[0] === 0xff && file.data[1] === 0xd8 && file.data[2] === 0xff;
    if (file.contentType === "image/png") return file.data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return file.data.toString("ascii", 0, 4) === "RIFF" && file.data.toString("ascii", 8, 12) === "WEBP";
}

function parseMultipart(request, body) {
    const match = request.headers["content-type"]?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) return null;
    const boundary = Buffer.from(`--${match[1] || match[2]}`);
    const parts = {};
    let cursor = body.indexOf(boundary);
    while (cursor !== -1) {
        const start = cursor + boundary.length;
        const next = body.indexOf(boundary, start);
        if (next === -1) break;
        const part = body.subarray(start, next);
        const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd !== -1) {
            const headers = part.subarray(0, headerEnd).toString("utf8");
            const name = headers.match(/name="([^"]+)"/i)?.[1];
            const fileName = headers.match(/filename="([^"]*)"/i)?.[1];
            const contentType = headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim();
            const data = part.subarray(headerEnd + 4, part.length - 2);
            if (name) parts[name] = fileName ? { contentType, data } : data.toString("utf8");
        }
        cursor = next;
    }
    return parts;
}

function readRequestBody(request, callback) {
    const chunks = [];
    let total = 0;
    request.on("data", (chunk) => {
        total += chunk.length;
        if (total <= 12 * 1024 * 1024) chunks.push(chunk);
    });
    request.on("end", () => callback(total <= 12 * 1024 * 1024 ? Buffer.concat(chunks) : null));
}

const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const authorization = request.headers.authorization || "";
    const allowedOrigins = new Set([
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        ...(process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
    ]);
    const origin = request.headers.origin;
    const localNetworkOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}):5500$/.test(origin || "");
    if (origin && (allowedOrigins.has(origin) || localNetworkOrigin || origin === "null")) response.allowedOrigin = origin;
    if (request.method === "OPTIONS") {
        setSecurityHeaders(response);
        if (response.allowedOrigin) response.setHeader("Access-Control-Allow-Origin", response.allowedOrigin);
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.statusCode = 204;
        response.end();
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

    if (requestUrl.pathname === "/api/usuario/status") {
        getAuthenticatedUserId(authorization).then((userId) => {
            sendJson(response, 200, { verificado: Boolean(userId && localVerifiedUsers.has(userId)) });
        });
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/usuario") {
        readRequestBody(request, (body) => {
            const fields = body && parseMultipart(request, body);
            const frente = fields?.documento_frente;
            const verso = fields?.documento_verso;
            getAuthenticatedUserId(authorization).then((userId) => {
                if (!userId) {
                    sendJson(response, 401, { success: false, error: "Faça login para continuar." });
                    return;
                }
                if (!fields?.nome || fields.aceite_documentos !== "on") {
                    sendJson(response, 400, { success: false, error: "Informe seu nome e autorize o uso dos documentos." });
                    return;
                }
                if (!fields.nome_conta || normalizeName(fields.nome) !== normalizeName(fields.nome_conta)) {
                    sendJson(response, 409, { success: false, code: "NOME_DIVERGENTE", error: "O nome precisa ser o mesmo usado no cadastro." });
                    return;
                }
                if (!isAdult(fields.data_nascimento)) {
                    sendJson(response, 403, { success: false, code: "IDADE_MINIMA", error: "É necessário ter 18 anos ou mais para criar um perfil." });
                    return;
                }
                if (!hasValidImageSignature(frente) || !hasValidImageSignature(verso)) {
                    sendJson(response, 400, { success: false, error: "Envie fotos JPEG, PNG ou WEBP válidas da frente e do verso do RG." });
                    return;
                }
                localVerifiedUsers.add(userId);
                sendJson(response, 201, { success: true });
            });
        });
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/usuario/destaques") {
        readRequestBody(request, (body) => {
            try {
                const profile = body ? JSON.parse(body.toString("utf8")) : {};
                if (!profile.nome || !String(profile.nome).trim()) {
                    sendJson(response, 400, { success: false, error: "Informe o nome do perfil." });
                    return;
                }
                sendJson(response, 201, { success: true, profile: saveFeaturedProfile({ ...profile, ativo: true }) });
            } catch {
                sendJson(response, 400, { success: false, error: "Dados de perfil inválidos." });
            }
        });
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/usuario/destaques/acesso") {
        readRequestBody(request, (body) => {
            try {
                const { slug } = body ? JSON.parse(body.toString("utf8")) : {};
                if (!slug || !incrementFeaturedProfileAccess(String(slug))) {
                    sendJson(response, 404, { success: false, error: "Perfil não encontrado." });
                    return;
                }
                sendJson(response, 200, { success: true });
            } catch {
                sendJson(response, 400, { success: false, error: "Dados de acesso inválidos." });
            }
        });
        return;
    }

    if (![
        "GET",
        "HEAD",
    ].includes(request.method)) {
        sendJson(response, 405, { error: "Método não permitido" });
        return;
    }

    if (requestUrl.pathname === "/api/servicos") {
        sendJson(response, 200, []);
        return;
    }

    if (requestUrl.pathname === "/api/usuario/destaques") {
        sendJson(response, 200, loadFeaturedProfiles().filter((profile) => profile.ativo !== false));
        return;
    }

    serveFile(response, requestUrl.pathname);
});

if (require.main === module) {
    server.listen(port, process.env.HOST || "0.0.0.0", () => {
        console.log(`Servidor local em http://localhost:${port}`);
    });
}

module.exports = server;
