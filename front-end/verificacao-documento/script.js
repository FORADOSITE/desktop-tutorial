const apiBase = window.location.protocol === "file:" || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) && window.location.port !== "3000"
    ? "http://localhost:3000/api"
    : "/api";
const UPLOAD_TIMEOUT_MS = 30000;
const form = document.getElementById("verification-form");
const statusElement = document.getElementById("status");
const dataNascimentoElement = document.getElementById("data-nascimento");
const nomeElement = document.getElementById("nome");
const nomeContaElement = document.getElementById("nome-conta");

async function fetchComTimeout(url, options = {}, timeoutMs = UPLOAD_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("O envio demorou demais. Verifique sua conexão e tente novamente.");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

function dataLimiteParaMaioridade() {
    const hoje = new Date();
    return `${hoje.getFullYear() - 18}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

dataNascimentoElement.max = dataLimiteParaMaioridade();

function mostrarStatus(message, error = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", error);
}

function arquivoValido(arquivo) {
    return arquivo && ["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) && arquivo.size <= 5 * 1024 * 1024;
}

function nomeDaConta(user) {
    return user.username || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "";
}

async function carregarClerk() {
    const config = await fetch(`${apiBase}/config`).then((response) => response.json());
    if (!config.clerkPublishableKey) throw new Error("A autenticação ainda não está configurada.");

    const clerkDomain = atob(config.clerkPublishableKey.split("_")[2]).slice(0, -1);
    const carregarScript = (src, attributes = {}) => new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.crossOrigin = "anonymous";
        script.src = src;
        Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value));
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    await carregarScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.clerkPublishableKey,
    });
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
}

async function iniciar() {
    await carregarClerk();
    if (!window.Clerk.user || !window.Clerk.session) {
        window.location.href = "/front-end/login/index.html?cadastro=0";
        return;
    }

    const nome = nomeDaConta(window.Clerk.user);
    if (!nome) {
        mostrarStatus("Não foi possível identificar o nome da conta. Volte ao cadastro.", true);
        return;
    }
    nomeElement.value = nome;
    nomeContaElement.value = nome;
    nomeElement.readOnly = true;

    const email = window.Clerk.user.primaryEmailAddress;
    if (email?.verification?.status !== "verified") {
        mostrarStatus("Confirme seu e-mail antes de enviar o RG.", true);
        return;
    }

    const token = await window.Clerk.session.getToken();
    const response = await fetch(`${apiBase}/usuario/status`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok && (await response.json()).verificado) window.location.href = "/front-end/perfil/index.html";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter || form.querySelector("button[type=\"submit\"]");
    const frente = document.getElementById("documento-frente").files[0];
    const verso = document.getElementById("documento-verso").files[0];

    if (!nomeElement.value || nomeElement.value !== nomeContaElement.value) {
        mostrarStatus("O nome precisa ser o mesmo usado no cadastro.", true);
        return;
    }

    if (!frente || !verso || !arquivoValido(frente) || !arquivoValido(verso)) {
        mostrarStatus("Envie a frente e o verso do RG em JPG, PNG ou WEBP de até 5 MB.", true);
        return;
    }

    const dataNascimento = new Date(dataNascimentoElement.value);
    const limiteMaioridade = new Date(dataLimiteParaMaioridade());
    if (Number.isNaN(dataNascimento.getTime()) || dataNascimento > limiteMaioridade) {
        mostrarStatus("É necessário ter 18 anos ou mais para criar um perfil.", true);
        return;
    }

    button.disabled = true;
    mostrarStatus("Enviando documentos...");
    try {
        const token = await window.Clerk.session.getToken();
        const response = await fetchComTimeout(`${apiBase}/usuario`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: new FormData(form),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Não foi possível concluir a verificação.");
        window.location.href = "/front-end/escolha-perfil/index.html";
    } catch (error) {
        mostrarStatus(error.message, true);
        button.disabled = false;
    }
});

iniciar().catch((error) => mostrarStatus(error.message, true));
