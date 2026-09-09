const email = sessionStorage.getItem("email_pendente_confirmacao") || new URLSearchParams(window.location.search).get("email");
const emailElement = document.getElementById("email");
const message = document.getElementById("message");
const resendButton = document.getElementById("resend");
const continueButton = document.getElementById("continue");
let emailAddress;

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

async function carregarClerk() {
    const config = await fetch("/api/config").then((response) => response.json());
    if (!config.clerkPublishableKey) throw new Error("A autenticação ainda não está configurada.");
    const clerkDomain = atob(config.clerkPublishableKey.split("_")[2]).slice(0, -1);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.clerkPublishableKey,
    });
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
    emailAddress = window.Clerk.user?.primaryEmailAddress;
}

async function verificarConfirmacao() {
    await carregarClerk();
    if (emailAddress?.verification?.status === "verified") {
        sessionStorage.removeItem("email_pendente_confirmacao");
        window.location.href = "/front-end/verificacao-documento/index.html";
        return true;
    }
    return false;
}

if (email) emailElement.textContent = email;
else {
    emailElement.textContent = "o e-mail usado no cadastro";
    resendButton.disabled = true;
    message.textContent = "Volte ao cadastro para informar seu e-mail novamente.";
}

resendButton.addEventListener("click", async () => {
    resendButton.disabled = true;
    message.textContent = "Enviando...";
    try {
        await carregarClerk();
        if (!emailAddress) throw new Error("Sua sessão expirou. Volte ao cadastro e tente novamente.");
        await emailAddress.prepareVerification({ strategy: "email_code" });
        message.textContent = "Novo e-mail enviado. Confira sua caixa de entrada.";
    } catch (error) {
        message.textContent = error.message;
        resendButton.disabled = false;
    }
});

continueButton.addEventListener("click", async () => {
    continueButton.disabled = true;
    message.textContent = "Verificando confirmação...";
    try {
        if (!(await verificarConfirmacao())) message.textContent = "O e-mail ainda não foi confirmado.";
    } catch (error) {
        message.textContent = "Não foi possível verificar agora. Tente novamente.";
    } finally {
        continueButton.disabled = false;
    }
});
