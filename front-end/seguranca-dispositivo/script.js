const apiBase = window.location.protocol === "file:" ? "http://localhost:3000/api" : "/api";
const emailElement = document.getElementById("email");
const form = document.getElementById("device-form");
const codeElement = document.getElementById("security-code");
const confirmButton = document.getElementById("confirm");
const blockButton = document.getElementById("block");
const message = document.getElementById("message");
const deviceId = localStorage.getItem("fora-do-site-device-id") || "";
let clerkSession;

function mostrarMensagem(texto, erro = false) {
    message.textContent = texto;
    message.style.color = erro ? "#ff8d8d" : "#a9ffbd";
}

function carregarScript(src, attributes = {}) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.crossOrigin = "anonymous";
        script.src = src;
        Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value));
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function carregarSessao() {
    const config = await fetch(`${apiBase}/config`).then((response) => response.json());
    if (!config.clerkPublishableKey) throw new Error("A autenticação ainda não está configurada.");
    const clerkDomain = atob(config.clerkPublishableKey.split("_")[2]).slice(0, -1);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.clerkPublishableKey,
    });
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
    clerkSession = window.Clerk.session;
    if (!clerkSession || !deviceId) throw new Error("Sua sessão de segurança expirou. Faça login novamente.");
}

async function enviarResposta(caminho, code = "") {
    const token = await clerkSession.getToken();
    const response = await fetch(`${apiBase}/seguranca/dispositivo/${caminho}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Device-Id": deviceId,
        },
        body: JSON.stringify({ deviceId, code }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível atualizar a segurança da conta.");
}

emailElement.textContent = new URLSearchParams(window.location.search).get("email") || "seu e-mail cadastrado";

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    confirmButton.disabled = true;
    blockButton.disabled = true;
    mostrarMensagem("Confirmando dispositivo...");
    try {
        await enviarResposta("confirmar", codeElement.value);
        mostrarMensagem("Dispositivo confirmado. Redirecionando...");
        window.location.href = "/front-end/verificacao-documento/index.html";
    } catch (error) {
        mostrarMensagem(error.message, true);
        confirmButton.disabled = false;
        blockButton.disabled = false;
    }
});

blockButton.addEventListener("click", async () => {
    confirmButton.disabled = true;
    blockButton.disabled = true;
    mostrarMensagem("Bloqueando dispositivo...");
    try {
        await enviarResposta("bloquear");
        await window.Clerk.signOut();
        mostrarMensagem("Acesso bloqueado. Faça login apenas em um dispositivo reconhecido.");
    } catch (error) {
        mostrarMensagem(error.message, true);
        confirmButton.disabled = false;
        blockButton.disabled = false;
    }
});

carregarSessao().catch((error) => mostrarMensagem(error.message, true));
