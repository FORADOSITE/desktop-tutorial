const apiBase = window.location.protocol === "file:" ? "http://localhost:3000/api" : "/api";
const state = { plans: [], selectedPlan: null, ownerAccess: false, authToken: null };
const plansGrid = document.getElementById("plans-grid");
const checkoutSection = document.getElementById("checkout-section");
const checkoutStatus = document.getElementById("checkout-status");

function showStatus(message, isError = false) {
    checkoutStatus.textContent = message;
    checkoutStatus.style.color = isError ? "#ff6868" : "var(--green)";
}

function createPlanCard(plan) {
    const card = document.createElement("article");
    card.className = `plan-card ${plan.id === "premium" ? "featured" : ""}`;
    card.dataset.planId = plan.id;
    card.dataset.testid = `plan-card-${plan.id}`;
    if (plan.badge) {
        const badge = document.createElement("span");
        badge.className = "plan-badge";
        badge.dataset.testid = `plan-badge-${plan.id}`;
        badge.textContent = plan.badge;
        card.appendChild(badge);
    }
    const title = document.createElement("h2");
    title.className = "plan-title";
    title.dataset.testid = `plan-title-${plan.id}`;
    title.textContent = plan.title;
    card.appendChild(title);
    const price = document.createElement("div");
    price.className = "plan-price";
    price.dataset.testid = `plan-price-${plan.id}`;
    price.innerHTML = `<strong>${plan.price}</strong><span>${plan.period}</span>`;
    card.appendChild(price);
    if (plan.savings) {
        const savings = document.createElement("p");
        savings.className = "plan-savings";
        savings.dataset.testid = `plan-savings-${plan.id}`;
        savings.textContent = plan.savings;
        card.appendChild(savings);
    } else {
        const spacer = document.createElement("div");
        spacer.className = "plan-savings";
        spacer.setAttribute("aria-hidden", "true");
        card.appendChild(spacer);
    }
    const featureList = document.createElement("ul");
    featureList.className = "plan-features";
    featureList.dataset.testid = `plan-features-${plan.id}`;
    plan.features.forEach((feature, index) => {
        const item = document.createElement("li");
        item.dataset.testid = `plan-feature-${plan.id}-${index + 1}`;
        item.textContent = feature;
        featureList.appendChild(item);
    });
    card.appendChild(featureList);
    const button = document.createElement("button");
    button.className = "plan-select";
    button.type = "button";
    button.dataset.testid = `plan-select-${plan.id}`;
    button.textContent = state.ownerAccess && plan.id === "premium-anual"
        ? "Ativar acesso gratuito"
        : plan.id === "gratuito" ? "Escolher gratuito" : "Escolher este plano";
    button.addEventListener("click", () => selectPlan(plan));
    card.appendChild(button);
    return card;
}

function renderPlans() {
    plansGrid.replaceChildren(...state.plans.map(createPlanCard));
}

function selectPlan(plan) {
    if (state.ownerAccess) plan = state.plans.find((item) => item.id === "premium-anual");
    state.selectedPlan = plan;
    document.querySelectorAll(".plan-card").forEach((card) => card.classList.toggle("selected", card.dataset.planId === plan.id));
    document.getElementById("summary-plan-title").textContent = plan.title;
    document.getElementById("summary-plan-period").textContent = state.ownerAccess ? "permanente" : plan.period;
    document.getElementById("summary-plan-price").textContent = state.ownerAccess ? "R$ 0,00" : plan.price;
    document.getElementById("payment-block").hidden = state.ownerAccess;
    document.getElementById("pix-instructions").hidden = state.ownerAccess;
    document.getElementById("secure-fields").hidden = true;
    document.getElementById("recipient-notice").hidden = state.ownerAccess;
    document.getElementById("confirm-button").innerHTML = state.ownerAccess
        ? "Liberar Premium Anual <span>↗</span>"
        : "Confirmar assinatura <span>↗</span>";
    checkoutSection.hidden = false;
    checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    showStatus("");
}

function updatePaymentFields() {
    const method = document.querySelector("input[name=paymentMethod]:checked").value;
    document.getElementById("secure-fields").hidden = method !== "debit";
    document.getElementById("pix-instructions").hidden = method !== "pix";
}

async function loadCatalog() {
    try {
        const [response, owner] = await Promise.all([
            fetch(`${apiBase}/catalog/plans`),
            loadOwnerStatus(),
        ]);
        if (!response.ok) throw new Error("Falha ao carregar planos");
        const data = await response.json();
        state.plans = data.plans;
        state.ownerAccess = owner;
        renderPlans();
        if (state.ownerAccess) {
            document.getElementById("owner-access").hidden = false;
            selectPlan(state.plans.find((item) => item.id === "premium-anual"));
        }
    } catch (error) {
        plansGrid.innerHTML = '<div class="loading-state" data-testid="plans-error">Não foi possível carregar o catálogo. Tente novamente.</div>';
        console.error(error);
    }
}

async function loadOwnerStatus() {
    try {
        state.authToken = await window.ForaAuth.getToken();
        if (!state.authToken) return false;
        const response = await fetch(`${apiBase}/owner/status`, {
            headers: { Authorization: `Bearer ${state.authToken}` },
        });
        if (!response.ok) return false;
        return (await response.json()).isOwner === true;
    } catch (error) {
        console.warn("Não foi possível verificar o benefício da conta.", error);
        return false;
    }
}

async function confirmSubscription(event) {
    event.preventDefault();
    if (!state.selectedPlan) return showStatus("Escolha um plano antes de continuar.", true);
    const location = {
        cidade: document.getElementById("location-city").value.trim(),
        cep: document.getElementById("location-cep").value.trim(),
        estado: document.getElementById("location-state").value.trim().toUpperCase(),
    };
    if (!location.cidade || !location.cep || !location.estado) return showStatus("Informe cidade, CEP e estado para continuar.", true);
    const button = document.getElementById("confirm-button");
    const paymentMethod = state.ownerAccess ? "owner" : document.querySelector("input[name=paymentMethod]:checked").value;
    button.disabled = true;
    showStatus("Registrando sua confirmação segura...");
    try {
        const response = await fetch(state.ownerAccess ? `${apiBase}/owner/entitlement` : `${apiBase}/subscriptions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}),
            },
            body: JSON.stringify(state.ownerAccess
                ? { location }
                : { planId: state.selectedPlan.id, period: state.selectedPlan.period, paymentMethod, location }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || data.error || "Não foi possível confirmar.");
        localStorage.setItem("fora-do-site-subscription-id", data.subscription.id);
        showStatus(state.ownerAccess
            ? "Premium Anual permanente liberado sem cobrança. Seu selo e limite de 3 prévias já estão ativos."
            : `Assinatura ${data.subscription.planTitle} confirmada como MOCKADA. Seus dados de região foram salvos no backend.`);
        button.textContent = state.ownerAccess ? "Acesso liberado ✓" : "Assinatura confirmada ✓";
        document.getElementById("profile-link").hidden = false;
    } catch (error) {
        showStatus(error.message, true);
        button.disabled = false;
    }
}

document.querySelectorAll("input[name=paymentMethod]").forEach((input) => input.addEventListener("change", updatePaymentFields));
document.getElementById("confirm-button").addEventListener("click", confirmSubscription);
loadCatalog();