const apiBase = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
const defaultAvatar = "/front-end/intro/img/fds.png";
const params = new URLSearchParams(window.location.search);
const categoryKey = normalize(params.get("categoria") || "");
const categoryNames = {
    musica: "Música",
    audiovisual: "Audiovisual",
    "artes-visuais": "Artes visuais",
    literatura: "Literatura",
    danca: "Dança",
    moda: "Moda",
    projetos: "Projetos",
};
const title = document.getElementById("category-title");
const search = document.getElementById("profile-search");
const status = document.getElementById("directory-status");
const grid = document.getElementById("profiles-grid");
let profiles = [];

function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_]+/g, "-").trim();
}

function slug(value) {
    return normalize(value).replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
}

function render() {
    const term = normalize(search.value).replace(/-/g, " ");
    const filtered = profiles.filter((profile) => normalize(profile.nome).replace(/-/g, " ").includes(term));
    grid.replaceChildren();
    status.textContent = filtered.length ? `${filtered.length} ${filtered.length === 1 ? "perfil encontrado" : "perfis encontrados"}.` : "Nenhum perfil encontrado nesta categoria.";
    filtered.forEach((profile) => {
        const card = document.createElement("article");
        card.className = "artist-card";
        card.tabIndex = 0;
        card.innerHTML = '<div class="artist-image"><img alt=""><span class="artist-tag"></span></div><div class="artist-info"><h2></h2><p></p></div>';
        const image = card.querySelector("img");
        image.src = profile.image_perfil || defaultAvatar;
        image.alt = profile.nome || "Perfil";
        image.onerror = () => { image.src = defaultAvatar; };
        card.querySelector("h2").textContent = profile.nome || "Perfil sem nome";
        card.querySelector("p").textContent = profile.titulo || profile.tipo || "Artista independente";
        card.querySelector(".artist-tag").textContent = profile.tipo || profile.categoria || "ARTISTA";
        const open = () => { window.location.href = `/front-end/artista/index.html?perfil=${encodeURIComponent(profile.slug || slug(profile.nome))}`; };
        card.addEventListener("click", open);
        card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") open(); });
        grid.appendChild(card);
    });
}

title.textContent = categoryNames[categoryKey] || "Todos os perfis";
search.addEventListener("input", render);
fetch(`${apiBase}/usuario/destaques`)
    .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar perfis");
        return response.json();
    })
    .then((data) => {
        profiles = (Array.isArray(data) ? data : []).filter((profile) => !categoryKey || normalize(profile.categoria) === categoryKey || (categoryKey === "musica" && ["", "artista"].includes(normalize(profile.categoria))));
        render();
    })
    .catch(() => { status.textContent = "Não foi possível carregar os perfis agora."; });
