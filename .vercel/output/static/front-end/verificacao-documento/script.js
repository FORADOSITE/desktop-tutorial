const apiBase = "/api";
const form = document.getElementById("verification-form");
const statusElement = document.getElementById("status");
const dataNascimentoElement = document.getElementById("data-nascimento");

function dataLimiteParaMaioridade() {
    const hoje = new Date();
    return `${hoje.getFullYear() - 18}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

dataNascimentoElement.max = dataLimiteParaMaioridade();

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

function mostrarStatus(message, error = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", error);
}

async function iniciar() {
    const config = await fetch(`${apiBase}/config`).then((response) => response.json());
    if (!config.clerkPublishableKey) throw new Error("A autenticação ainda não está configurada.");

    const clerkDomain = atob(config.clerkPublishableKey.split("_")[2]).slice(0, -1);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.clerkPublishableKey,
    });
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });

    if (!window.Clerk.user || !window.Clerk.session) {
        window.location.href = "../login/index.html?cadastro=0";
        return;
    }

    const email = window.Clerk.user.primaryEmailAddress;
    if (email?.verification?.status !== "verified") {
        sessionStorage.setItem("email_pendente_confirmacao", email?.emailAddress || "");
        window.location.href = "../verificar-email/index.html";
        return;
    }

    const token = await window.Clerk.session.getToken();
    const statusResponse = await fetch(`${apiBase}/usuario/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (statusResponse.ok && (await statusResponse.json()).verificado) {
        window.location.href = "../perfil/index.html";
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const frente = document.getElementById("documento-frente").files[0];
    const verso = document.getElementById("documento-verso").files[0];

    if (!frente || !verso || frente.size > 5 * 1024 * 1024 || verso.size > 5 * 1024 * 1024) {
        mostrarStatus("Envie as duas imagens com no máximo 5 MB cada.", true);
        return;
    }

    if (dataNascimentoElement.value > dataNascimentoElement.max) {
        mostrarStatus("É necessário ter 18 anos ou mais para criar um perfil.", true);
        return;
    }

    button.disabled = true;
    mostrarStatus("Enviando documentos...");
    try {
        const token = await window.Clerk.session.getToken();
        const dados = new FormData(form);
        const response = await fetch(`${apiBase}/usuario`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: dados,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Não foi possível concluir a verificação.");

        window.location.href = "../perfil/index.html";
    } catch (error) {
        mostrarStatus(error.message, true);
        button.disabled = false;
    }
});

iniciar().catch((error) => mostrarStatus(error.message, true));
