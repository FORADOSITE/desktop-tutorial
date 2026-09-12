const defaultAvatar = "/front-end/intro/img/fds.png";
const storageKey = "fora-do-site-profile";
const isLocalFrontend = window.location.protocol === "file:" || window.location.port === "5500";
const apiBase = isLocalFrontend
    ? `${window.location.protocol === "file:" ? "http:" : window.location.protocol}//${window.location.hostname || "localhost"}:3000/api`
    : "/api";
const params = new URLSearchParams(window.location.search);
const isOwner = params.get("me") === "1";
let shareUrl = "";

function readLocalProfile() {
    try {
        return JSON.parse(localStorage.getItem(storageKey)) || null;
    } catch {
        return null;
    }
}

function normalizeName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function createSlug(value) {
    return normalizeName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function setText(id, value) {
    document.getElementById(id).textContent = value || "";
}

function renderSocials(profile) {
    const labels = { instagram: "Instagram", youtube: "YouTube", spotify: "Spotify" };
    const links = document.getElementById("social-links");
    links.replaceChildren();
    Object.entries(labels).forEach(([network, label]) => {
        if (!profile.socials?.[network]) return;
        const link = document.createElement("a");
        link.href = profile.socials[network];
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = label;
        links.appendChild(link);
    });
    links.hidden = !links.children.length;
}

function renderTracks(tracks = []) {
    const section = document.getElementById("tracks-section");
    const list = document.getElementById("tracks-list");
    list.replaceChildren();
    section.hidden = !tracks.length;
    document.getElementById("track-count").textContent = `${tracks.length} ${tracks.length === 1 ? "faixa" : "faixas"}`;
    tracks.forEach((track) => {
        const item = document.createElement("article");
        item.className = "public-track";
        item.innerHTML = `<img alt=""><div><strong></strong><audio controls preload="metadata"></audio></div>`;
        item.querySelector("img").src = track.coverUrl || defaultAvatar;
        item.querySelector("strong").textContent = track.title || "Prévia";
        item.querySelector("audio").src = track.previewUrl || "";
        list.appendChild(item);
    });
}

function renderProfile(profile) {
    const profileName = profile.name || profile.nome || "Perfil sem nome";
    setText("profile-type", profile.type || profile.category || "Artista / Criador");
    setText("profile-name", profileName);
    setText("profile-role", profile.role || profile.titulo || "Artista independente");
    setText("profile-bio", profile.bio || "");
    const avatar = document.getElementById("profile-avatar");
    avatar.src = profile.avatarUrl || profile.image_perfil || defaultAvatar;
    avatar.alt = profile.name || profile.nome || "Perfil";
    avatar.onerror = () => { avatar.src = defaultAvatar; };
    const publicUrl = new URL(window.location.href);
    publicUrl.search = "";
    publicUrl.searchParams.set("perfil", profile.slug || createSlug(profileName));
    shareUrl = publicUrl.toString();
    document.getElementById("share-profile").disabled = false;
    renderSocials(profile);
    renderTracks(profile.tracks);
    document.getElementById("profile-status").textContent = "";
}

async function copyProfileLink() {
    if (!shareUrl) return;
    try {
        await navigator.clipboard.writeText(shareUrl);
    } catch {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }
    const status = document.getElementById("profile-status");
    status.textContent = "Link do perfil copiado.";
    window.setTimeout(() => {
        if (status.textContent === "Link do perfil copiado.") status.textContent = "";
    }, 2500);
}

function registerProfileAccess(slug) {
    return fetch(`${apiBase}/usuario/destaques/acesso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
        keepalive: true,
    }).catch(() => {});
}

async function loadProfile() {
    const editLink = document.getElementById("edit-profile");
    editLink.hidden = !isOwner;
    if (isOwner) {
        const localProfile = readLocalProfile();
        if (localProfile?.name) {
            renderProfile(localProfile);
            return;
        }
    }

    const name = params.get("nome");
    const slug = params.get("perfil");
    if (!name) {
        document.getElementById("profile-status").textContent = "Perfil não encontrado.";
        return;
    }
    try {
        const response = await fetch(`${apiBase}/usuario/destaques`);
        if (!response.ok) throw new Error("Falha ao carregar perfil");
        const profiles = await response.json();
        const profile = profiles.find((item) => (slug && (item.slug === slug || createSlug(item.nome) === slug)) || (name && normalizeName(item.nome) === normalizeName(name)));
        if (!profile) throw new Error("Perfil não encontrado");
        renderProfile(profile);
        registerProfileAccess(profile.slug || createSlug(profile.nome));
    } catch (error) {
        console.error(error);
        document.getElementById("profile-status").textContent = "Não foi possível carregar este perfil agora.";
    }
}

document.getElementById("share-profile").addEventListener("click", copyProfileLink);
loadProfile();
