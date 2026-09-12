const authContainer = document.getElementById("clerk-auth");
const cadastro = new URLSearchParams(window.location.search).get("cadastro") === "1";
const params = new URLSearchParams(window.location.search);
const categoria = params.get("categoria") || localStorage.getItem("fora-do-site-category") || "Música";
const tipo = params.get("tipo") || localStorage.getItem("fora-do-site-profile-type") || "Artista";
localStorage.setItem("fora-do-site-category", categoria);
localStorage.setItem("fora-do-site-profile-type", tipo);
document.documentElement.dataset.authMode = cadastro ? "signup" : "signin";
const isLocalDevelopment = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
    && window.location.port !== "3000";
const apiBase = window.location.protocol === "file:" || isLocalDevelopment
    ? "http://localhost:3000/api"
    : "/api";

const clerkAppearance = {
    variables: {
        colorPrimary: "#9cff00",
        colorText: "#f2f2f2",
        colorTextSecondary: "#9d9f9a",
        colorBackground: "#0b0c0b",
        colorInputBackground: "#080908",
        colorInputText: "#f2f2f2",
        colorTextOnPrimaryBackground: "#050505",
        colorDanger: "#ff6868",
        borderRadius: "3px",
        fontFamily: "Inter, sans-serif",
    },
    elements: {
        card: "auth-card",
        cardBox: "auth-card-box",
        rootBox: "auth-root",
        main: "auth-main",
        headerTitle: "auth-title",
        headerSubtitle: "auth-subtitle",
        formFieldInput: "auth-input",
        formFieldLabel: "auth-label",
        formFieldErrorText: "auth-error",
        formButtonPrimary: "auth-button",
        socialButtons: "auth-social-buttons",
        socialButtonsBlockButton: "auth-social-button",
        footerActionText: "auth-footer-text",
        footerActionLink: "auth-link",
        identityPreviewEditButton: "auth-link",
        dividerLine: "auth-divider",
        dividerText: "auth-divider-text",
    },
};

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

async function carregarClerk(publishableKey) {
    const clerkDomain = atob(publishableKey.split("_")[2]).slice(0, -1);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": publishableKey,
    });
}

async function carregarLocalizacao() {
    const localizacoes = await import("https://esm.sh/@clerk/localizations@latest?target=es2020");
    return {
        ...localizacoes.ptBR,
        signIn: {
            ...localizacoes.ptBR.signIn,
            start: { ...localizacoes.ptBR.signIn?.start, subtitle: "para continuar dentro da cultura" },
        },
        signUp: {
            ...localizacoes.ptBR.signUp,
            start: { ...localizacoes.ptBR.signUp?.start, subtitle: "para continuar dentro da cultura" },
        },
    };
}

function ocultarElementosClerk() {
    authContainer.querySelectorAll("button").forEach((button) => {
        if (button.textContent.toLowerCase().includes("github")) {
            button.classList.add("github-hidden");
            button.setAttribute("aria-hidden", "true");
        }
    });

    authContainer.querySelectorAll("p").forEach((paragraph) => {
        const text = paragraph.textContent.trim().toLowerCase();
        if (text === "secured by" || text === "development mode") paragraph.hidden = true;
    });
}

function observarProvedores() {
    ocultarElementosClerk();
    new MutationObserver(ocultarElementosClerk).observe(authContainer, { childList: true, subtree: true });
}

function hasSavedProfile() {
    try {
        return Boolean(JSON.parse(localStorage.getItem("fora-do-site-profile"))?.name);
    } catch {
        return false;
    }
}

async function hasPublishedProfile() {
    const nome = window.Clerk.user && (window.Clerk.user.username || [window.Clerk.user.firstName, window.Clerk.user.lastName].filter(Boolean).join(" "));
    if (!nome) return false;
    try {
        const response = await fetch(`${apiBase}/usuario/${encodeURIComponent(nome)}`);
        return response.ok;
    } catch {
        return false;
    }
}

async function verificarDocumentacao() {
    const token = await window.Clerk.session.getToken();
    const response = await fetch(`${apiBase}/usuario/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return false;
    const status = await response.json();
    return status.verificado === true;
}

async function iniciarClerk() {
    const configResponse = await fetch(`${apiBase}/config`);
    const contentType = configResponse.headers.get("content-type") || "";
    if (!configResponse.ok || !contentType.includes("application/json")) {
        throw new Error("Não foi possível conectar à API. Inicie o servidor em localhost:3000.");
    }

    const config = await configResponse.json();
    if (!config.clerkPublishableKey) {
        authContainer.textContent = "A autenticação ainda não foi configurada no servidor.";
        return;
    }

    await carregarClerk(config.clerkPublishableKey);
    const localizacao = await carregarLocalizacao();
    await window.Clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
        localization: localizacao,
    });

    if (window.Clerk.user) {
        const verificado = await verificarDocumentacao();
        const hasProfile = hasSavedProfile() || await hasPublishedProfile();
        window.location.href = verificado
            ? (hasProfile ? "/front-end/artista/index.html?me=1" : "/front-end/escolha-perfil/index.html")
            : "/front-end/verificacao-documento/index.html";
        return;
    }

    authContainer.replaceChildren();
    observarProvedores();

    const signInOptions = {
        routing: "hash",
        signUpUrl: `/front-end/login/index.html?cadastro=1&categoria=${encodeURIComponent(categoria)}`,
        afterSignInUrl: "/front-end/verificacao-documento/index.html",
        appearance: clerkAppearance,
    };

    if (cadastro) {
        window.Clerk.mountSignUp(authContainer, {
            routing: "hash",
            signInUrl: `/front-end/login/index.html?cadastro=0&categoria=${encodeURIComponent(categoria)}`,
            afterSignUpUrl: "/front-end/verificar-email/index.html",
            appearance: clerkAppearance,
        });
        return;
    }

    window.Clerk.mountSignIn(authContainer, signInOptions);
}

iniciarClerk().catch((error) => {
    console.error("Falha ao inicializar o Clerk:", error);
    authContainer.textContent = "Não foi possível carregar a autenticação. Tente novamente.";
});
