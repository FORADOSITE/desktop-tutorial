const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { verifyToken } = require("@clerk/backend");

const rootDir = path.resolve(__dirname, "..");
const envFile = path.join(__dirname, ".env");
const maxRequestBytes = 12 * 1024 * 1024;
const deviceChallengeLifetimeMs = 15 * 60 * 1000;
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

const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? path.join("/tmp", "fora-do-site-data") : path.join(__dirname, "data"));
const profilesFile = path.join(dataDir, "profiles.json");
const verificationsFile = path.join(dataDir, "verifications.json");
const devicesFile = path.join(dataDir, "devices.json");
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const verificationsKey = "fora-do-site:verifications";
const devicesKey = "fora-do-site:devices";
const port = Number(process.env.PORT || 3000);
const allowedAccountEmails = new Set((process.env.ALLOWED_ACCOUNT_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
const blockAllAccounts = process.env.BLOCK_ALL_ACCOUNTS === "true";

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function extractEmailFromClaims(claims) {
    if (!claims || typeof claims !== "object") return "";

    const candidates = [
        claims.email,
        claims.primary_email_address,
        claims.primaryEmailAddress,
        claims.email_address,
        claims.emailAddress,
        claims.user?.email,
        claims.user?.primary_email_address,
        claims.user?.primaryEmailAddress,
        Array.isArray(claims.email_addresses) ? claims.email_addresses.map((entry) => entry?.email_address || entry?.email || entry) : [],
        Array.isArray(claims.emailAddresses) ? claims.emailAddresses.map((entry) => entry?.email_address || entry?.email || entry) : [],
    ].flat();

    for (const value of candidates) {
        if (typeof value === "string") {
            const normalized = normalizeEmail(value);
            if (normalized) return normalized;
        }
        if (value && typeof value === "object") {
            const normalized = normalizeEmail(value.email_address || value.email || value.address || "");
            if (normalized) return normalized;
        }
    }

    return "";
}

function isAllowedAccount(claims) {
    const email = extractEmailFromClaims(claims);
    return Boolean(email && allowedAccountEmails.has(email));
}

function normalizeKey(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

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

const acceptedDocumentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function redisCommand(command, ...args) {
    if (!redisUrl || !redisToken) return null;
    const response = await fetch(redisUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${redisToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify([command, ...args]),
    });
    if (!response.ok) throw new Error("Não foi possível acessar o armazenamento de dados.");
    const result = await response.json();
    return result.result;
}

async function loadVerifiedUsers() {
    if (redisUrl && redisToken) {
        const value = await redisCommand("GET", verificationsKey);
        try {
            const users = JSON.parse(value || "[]");
            return new Set(Array.isArray(users) ? users : []);
        } catch {
            return new Set();
        }
    }

    try {
        const users = JSON.parse(fs.readFileSync(verificationsFile, "utf8"));
        return new Set(Array.isArray(users) ? users : []);
    } catch {
        return new Set();
    }
}

async function saveVerifiedUser(userId) {
    const users = await loadVerifiedUsers();
    users.add(userId);
    if (redisUrl && redisToken) {
        await redisCommand("SET", verificationsKey, JSON.stringify([...users]));
        return;
    }
    fs.mkdirSync(path.dirname(verificationsFile), { recursive: true });
    fs.writeFileSync(verificationsFile, JSON.stringify([...users], null, 2));
}

async function loadDeviceState() {
    if (redisUrl && redisToken) {
        const value = await redisCommand("GET", devicesKey);
        try {
            const state = JSON.parse(value || "{}");
            return state && typeof state === "object" ? state : {};
        } catch {
            return {};
        }
    }

    try {
        const state = JSON.parse(fs.readFileSync(devicesFile, "utf8"));
        return state && typeof state === "object" ? state : {};
    } catch {
        return {};
    }
}

async function saveDeviceState(state) {
    if (redisUrl && redisToken) {
        await redisCommand("SET", devicesKey, JSON.stringify(state));
        return;
    }
    fs.mkdirSync(path.dirname(devicesFile), { recursive: true });
    fs.writeFileSync(devicesFile, JSON.stringify(state, null, 2));
}

function getDeviceId(request) {
    const deviceId = String(request.headers["x-device-id"] || "").trim();
    return /^[a-zA-Z0-9_-]{20,100}$/.test(deviceId) ? deviceId : "";
}

function maskEmail(email) {
    const [name, domain] = email.split("@");
    if (!name || !domain) return "seu e-mail cadastrado";
    return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

async function getUserEmail(claims) {
    const claimEmail = extractEmailFromClaims(claims);
    if (claimEmail) return claimEmail;
    if (!process.env.CLERK_SECRET_KEY || !claims?.sub) return "";

    try {
        const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(claims.sub)}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
        });
        if (!response.ok) return "";
        const user = await response.json();
        const primaryId = user.primary_email_address_id;
        const primary = user.email_addresses?.find((entry) => entry.id === primaryId) || user.email_addresses?.[0];
        return normalizeEmail(primary?.email_address);
    } catch {
        return "";
    }
}

async function sendDeviceChallengeEmail(email, code) {
    if (!process.env.RESEND_API_KEY || !process.env.SECURITY_EMAIL_FROM) {
        throw new Error("A confirmação de novo dispositivo ainda não foi configurada.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: process.env.SECURITY_EMAIL_FROM,
            to: [email],
            subject: "Novo acesso ao FORA DO SITE",
            html: `<p>Detectamos uma tentativa de acesso por um novo dispositivo.</p><p>Se foi você, confirme o acesso no site usando o código:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Se não foi você, escolha <strong>Bloquear este acesso</strong> na tela de segurança. O dispositivo continuará bloqueado.</p>`,
        }),
    });
    if (!response.ok) throw new Error("Não foi possível enviar o aviso de segurança.");
}

async function checkDeviceAccess(claims, request) {
    const userId = claims?.sub;
    const deviceId = getDeviceId(request);
    if (!userId || !deviceId) return { allowed: false, code: "DISPOSITIVO_NAO_IDENTIFICADO" };

    const state = await loadDeviceState();
    const account = state[userId] || { trusted: [], blocked: [], pending: null };
    if (account.blocked.includes(deviceId)) return { allowed: false, code: "DISPOSITIVO_BLOQUEADO" };
    if (account.trusted.some((device) => device.id === deviceId)) return { allowed: true };

    if (account.pending?.deviceId === deviceId && account.pending.expiresAt > Date.now()) {
        return { allowed: false, code: "CONFIRMACAO_PENDENTE", email: account.pending.email };
    }

    if (account.trusted.length < 2) {
        account.trusted.push({ id: deviceId, userAgent: request.headers["user-agent"] || "", trustedAt: new Date().toISOString() });
        account.pending = null;
        state[userId] = account;
        await saveDeviceState(state);
        return { allowed: true };
    }

    const email = await getUserEmail(claims);
    if (!email) return { allowed: false, code: "CONFIRMACAO_NAO_CONFIGURADA" };
    const code = String(crypto.randomInt(100000, 1000000));
    await sendDeviceChallengeEmail(email, code);
    account.pending = { deviceId, email: maskEmail(email), code, expiresAt: Date.now() + deviceChallengeLifetimeMs };
    state[userId] = account;
    await saveDeviceState(state);
    return { allowed: false, code: "CONFIRMACAO_PENDENTE", email: maskEmail(email) };
}

async function confirmDeviceAccess(userId, deviceId, code, block) {
    const state = await loadDeviceState();
    const account = state[userId];
    if (!account?.pending || account.pending.deviceId !== deviceId || account.pending.expiresAt <= Date.now()) {
        return { ok: false, error: "Este pedido de acesso expirou. Faça login novamente." };
    }
    if (block) {
        account.blocked = [...new Set([...account.blocked, deviceId])];
        account.pending = null;
        state[userId] = account;
        await saveDeviceState(state);
        return { ok: true };
    }
    if (account.pending.code !== code) return { ok: false, error: "Código de segurança inválido." };
    account.trusted = [...account.trusted.slice(-1), { id: deviceId, trustedAt: new Date().toISOString() }];
    account.pending = null;
    state[userId] = account;
    await saveDeviceState(state);
    return { ok: true };
}

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
    const email = normalizeEmail(profile.email || "");
    const usuario = normalizeKey(profile.usuario || "");
    const existingIndex = profiles.findIndex((item) => normalizeName(item.nome) === normalizedName);
    const existingProfile = existingIndex === -1 ? null : profiles[existingIndex];
    const exactDuplicateIndex = profiles.findIndex((item) => {
        return normalizeName(item.nome) === normalizedName
            && normalizeKey(item.usuario || "") === usuario
            && normalizeEmail(item.email || "") === email;
    });
    if (exactDuplicateIndex !== -1 && exactDuplicateIndex !== existingIndex) {
        throw new Error("Já existe um usuário com o mesmo nome, usuário e e-mail.");
    }
    const savedProfile = {
        nome: String(profile.nome).trim().slice(0, 80),
        usuario: String(profile.usuario || "").trim().slice(0, 60),
        email: normalizeEmail(profile.email || ""),
        slug: normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        titulo: String(profile.titulo || "Artista independente").trim().slice(0, 90),
        bio: String(profile.bio || "").trim().slice(0, 600),
        categoria: String(profile.categoria || existingProfile?.categoria || "Música").trim().slice(0, 40),
        tipo: String(profile.tipo || existingProfile?.tipo || "Artista").trim().slice(0, 40),
        acessos: Number.isFinite(Number(profile.acessos)) ? Number(profile.acessos) : Number(existingProfile?.acessos || 0),
        image_perfil: typeof profile.image_perfil === "string" && profile.image_perfil.startsWith("data:image/")
            ? profile.image_perfil.slice(0, 8 * 1024 * 1024)
            : null,
        ativo: profile.ativo !== false,
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

async function getAuthenticatedUserInfo(authorization) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token || !process.env.CLERK_SECRET_KEY) return null;

    try {
        return await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    } catch (error) {
        console.error("Falha ao validar token Clerk:", error.message);
        return null;
    }
}

async function getAuthenticatedUserId(authorization) {
    const claims = await getAuthenticatedUserInfo(authorization);
    return claims?.sub || null;
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
        if (total <= maxRequestBytes) chunks.push(chunk);
    });
    request.on("end", () => callback(total <= maxRequestBytes ? Buffer.concat(chunks) : null));
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
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Id");
        response.statusCode = 204;
        response.end();
        return;
    }

    if (requestUrl.pathname === "/api/config") {
        sendJson(response, 200, {
            clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                || process.env.CLERK_PUBLISHABLE_KEY
                || null,
            accountAccessBlocked: blockAllAccounts,
        });
        return;
    }

    if (requestUrl.pathname === "/api/test") {
        sendJson(response, 200, { ok: true });
        return;
    }

    if (requestUrl.pathname === "/api/usuario/status") {
        getAuthenticatedUserInfo(authorization).then(async (claims) => {
            const userId = claims?.sub || null;
            if (!userId) {
                sendJson(response, 401, { verificado: false, error: "Faça login para continuar." });
                return;
            }
            const deviceAccess = await checkDeviceAccess(claims, request).catch((error) => ({
                allowed: false,
                code: "CONFIRMACAO_NAO_CONFIGURADA",
                error: error.message,
            }));
            if (!deviceAccess.allowed) {
                sendJson(response, 403, {
                    verificado: false,
                    dispositivoPermitido: false,
                    code: deviceAccess.code,
                    email: deviceAccess.email,
                    error: deviceAccess.error || "Confirme este dispositivo para continuar.",
                });
                return;
            }
            const isAllowed = isAllowedAccount(claims);
            sendJson(response, 200, {
                verificado: Boolean((await loadVerifiedUsers()).has(userId) || isAllowed),
                dispositivoPermitido: true,
            });
        });
        return;
    }

    if (request.method === "POST" && [
        "/api/seguranca/dispositivo/confirmar",
        "/api/seguranca/dispositivo/bloquear",
    ].includes(requestUrl.pathname)) {
        readRequestBody(request, async (body) => {
            const claims = await getAuthenticatedUserInfo(authorization);
            if (!claims?.sub) {
                sendJson(response, 401, { success: false, error: "Faça login para continuar." });
                return;
            }
            let payload = {};
            try {
                payload = body ? JSON.parse(body.toString("utf8")) : {};
            } catch {
                sendJson(response, 400, { success: false, error: "Dados de segurança inválidos." });
                return;
            }
            const deviceId = getDeviceId(request);
            if (!deviceId) {
                sendJson(response, 400, { success: false, error: "Dispositivo não identificado." });
                return;
            }
            const result = await confirmDeviceAccess(claims.sub, deviceId, String(payload.code || ""), requestUrl.pathname.endsWith("/bloquear"));
            sendJson(response, result.ok ? 200 : 400, result.ok
                ? { success: true }
                : { success: false, error: result.error });
        });
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/usuario") {
        if (Number(request.headers["content-length"] || 0) > maxRequestBytes) {
            sendJson(response, 413, { success: false, error: "O envio excede o limite permitido de 12 MB." });
            request.resume();
            return;
        }
        readRequestBody(request, (body) => {
            const fields = body && parseMultipart(request, body);
            const frente = fields?.documento_frente;
            const verso = fields?.documento_verso;
            getAuthenticatedUserInfo(authorization).then(async (claims) => {
                const userId = claims?.sub || null;
                const allowBypass = isAllowedAccount(claims);
                if (!userId) {
                    sendJson(response, 401, { success: false, error: "Faça login para continuar." });
                    return;
                }
                const deviceAccess = await checkDeviceAccess(claims, request).catch((error) => ({
                    allowed: false,
                    code: "CONFIRMACAO_NAO_CONFIGURADA",
                    error: error.message,
                }));
                if (!deviceAccess.allowed) {
                    sendJson(response, 403, {
                        success: false,
                        code: deviceAccess.code,
                        error: deviceAccess.error || "Confirme este dispositivo para continuar.",
                    });
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
                if (!allowBypass) {
                    if (!fields.data_nascimento) {
                        sendJson(response, 400, { success: false, error: "Informe a data de nascimento conforme o RG." });
                        return;
                    }
                    if (!isAdult(fields.data_nascimento)) {
                        sendJson(response, 403, { success: false, code: "IDADE_MINIMA", error: "É necessário ter 18 anos ou mais para criar um perfil." });
                        return;
                    }
                    if (!frente || !verso) {
                        sendJson(response, 400, { success: false, error: "Envie a frente e o verso do RG para continuar." });
                        return;
                    }
                    if (!hasValidImageSignature(frente) || !hasValidImageSignature(verso)) {
                        sendJson(response, 400, { success: false, error: "As imagens do RG estão corrompidas, fora do formato ou muito grandes. Envie JPG, PNG ou WEBP válidos até 5 MB." });
                        return;
                    }
                }
                await saveVerifiedUser(userId);
                sendJson(response, 201, { success: true });
            });
        });
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/usuario/destaques") {
        readRequestBody(request, (body) => {
            getAuthenticatedUserInfo(authorization).then((claims) => {
                if (!claims?.sub) {
                    sendJson(response, 401, { success: false, error: "Faça login para publicar o perfil." });
                    return;
                }
                try {
                    const profile = body ? JSON.parse(body.toString("utf8")) : {};
                    if (!profile.nome || !String(profile.nome).trim()) {
                        sendJson(response, 400, { success: false, error: "Informe o nome do perfil." });
                        return;
                    }
                    const savedProfile = saveFeaturedProfile({ ...profile, ativo: true });
                    sendJson(response, 201, { success: true, profile: savedProfile });
                } catch (error) {
                    const message = error?.message || "Dados de perfil inválidos.";
                    sendJson(response, 409, { success: false, error: message });
                }
            });
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

    const publicProfileMatch = requestUrl.pathname.match(/^\/api\/usuario\/([^/]+)$/);
    if (publicProfileMatch) {
        const name = decodeURIComponent(publicProfileMatch[1]);
        const profile = loadFeaturedProfiles().find((item) => normalizeName(item.nome) === normalizeName(name) && item.ativo !== false);
        if (!profile) {
            sendJson(response, 404, { error: "Usuário não encontrado" });
            return;
        }
        sendJson(response, 200, [profile]);
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
