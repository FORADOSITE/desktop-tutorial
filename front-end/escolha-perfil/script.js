const storageCategory = "fora-do-site-category";
const storageType = "fora-do-site-profile-type";
const cards = [...document.querySelectorAll(".choice-card")];
const form = document.getElementById("profile-choice-form");
const status = document.getElementById("choice-status");
let selectedCard = cards[0];

function selectCard(card) {
    selectedCard = card;
    cards.forEach((item) => item.classList.toggle("selected", item === card));
}

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
