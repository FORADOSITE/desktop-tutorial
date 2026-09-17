(function () {
    let sessionPromise = null;

    function loadScript(src, attributes = {}) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (window.Clerk) resolve();
                else existing.addEventListener("load", resolve, { once: true });
                return;
            }
            const script = document.createElement("script");
            script.crossOrigin = "anonymous";
            script.src = src;
            Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value));
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function initialize() {
        const response = await fetch("/api/config");
        if (!response.ok) throw new Error("Configuração de acesso indisponível.");
        const config = await response.json();
        if (!config.clerkPublishableKey) return null;
        if (!window.Clerk) {
            const clerkDomain = atob(config.clerkPublishableKey.split("_")[2]).slice(0, -1);
            await loadScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
                "data-clerk-publishable-key": config.clerkPublishableKey,
            });
        }
        await window.Clerk.load();
        return window.Clerk.session || null;
    }

    window.ForaAuth = {
        getSession() {
            if (!sessionPromise) sessionPromise = initialize();
            return sessionPromise;
        },
        async getToken() {
            const session = await this.getSession();
            return session ? session.getToken() : null;
        },
    };
})();