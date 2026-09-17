const storageCategory = "fora-do-site-category";
const storageType = "fora-do-site-profile-type";
const cards = [...document.querySelectorAll(".choice-card")];
const form = document.getElementById("profile-choice-form");
const status = document.getElementById("choice-status");
let selectedCard = cards[0];

function hasSavedProfile() {
    try {
        return Boolean(JSON.parse(localStorage.getItem("fora-do-site-profile"))?.name);
    } catch {
        return false;
    }
}

if (hasSavedProfile()) {
    window.location.replace("/front-end/artista/index.html?me=1");
}

function selectCard(card) {
    selectedCard = card;
    cards.forEach((item) => item.classList.toggle("selected", item === card));
}

const savedCategory = localStorage.getItem(storageCategory);
const savedType = localStorage.getItem(storageType);
const savedCard = cards.find((card) => card.dataset.category === savedCategory && card.dataset.type === savedType);
if (savedCard) selectCard(savedCard);

cards.forEach((card) => card.addEventListener("click", () => selectCard(card)));

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedCard) {
        status.textContent = "Escolha uma opção para continuar.";
        return;
    }
    localStorage.setItem(storageCategory, selectedCard.dataset.category);
    localStorage.setItem(storageType, selectedCard.dataset.type);
    window.location.href = "/front-end/perfil/index.html";
});
