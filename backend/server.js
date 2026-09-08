const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envFile = path.join(__dirname, ".env");
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

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, {
        "Access-Control-Allow-Origin": "*",
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

    serveFile(response, requestUrl.pathname);
});

server.listen(port, () => {
    console.log(`Servidor local em http://localhost:${port}`);
});
