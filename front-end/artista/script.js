const defaultAvatar = "/front-end/intro/img/fds.png";
const storageKey = "fora-do-site-profile";
const apiBase = window.location.protocol === "file:" || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) && window.location.port !== "3000"
    ? "http://localhost:3000/api"
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

function renderProjects(projects = []) {
    const section = document.getElementById("projects-section");
    const list = document.getElementById("projects-list");
    const labels = { edital: "Edital", show: "Show", batalha: "Batalha" };
    list.replaceChildren();
    section.hidden = !projects.length;
    document.getElementById("project-count").textContent = `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`;
    projects.forEach((project) => {
        const item = document.createElement("article");
        item.className = "public-project";
        item.innerHTML = `<img alt=""><div><span></span><p></p><small></small></div>`;
        item.querySelector("img").src = project.logoUrl || defaultAvatar;
        item.querySelector("span").textContent = labels[project.type] || "Projeto";
        item.querySelector("p").textContent = project.description || "";
        item.querySelector("small").textContent = project.type === "show"
            ? [project.email, project.phoneOne, project.phoneTwo].filter(Boolean).join(" | ")
            : project.type === "batalha"
                ? [project.date, project.time, project.location].filter(Boolean).join(" | ")
                : "PDF do edital disponível";
        if (project.pdfUrl) {
            const link = document.createElement("a");
            link.href = project.pdfUrl;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = "Abrir edital em PDF";
            item.querySelector("div").appendChild(link);
        }
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
    publicUrl.search = `?nome=${encodeURIComponent(profileName)}`;
    shareUrl = publicUrl.toString();
    document.getElementById("share-profile").disabled = false;
    renderSocials(profile);
    renderTracks(profile.tracks);
    renderProjects(profile.projects);
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
    if (!name) {
        document.getElementById("profile-status").textContent = "Perfil não encontrado.";
        return;
    }
    try {
        const response = await fetch(`${apiBase}/usuario/destaques`);
        if (!response.ok) throw new Error("Falha ao carregar perfil");
        const profiles = await response.json();
        const profile = profiles.find((item) => item.nome === name);
        if (!profile) throw new Error("Perfil não encontrado");
        renderProfile(profile);
    } catch (error) {
        console.error(error);
        document.getElementById("profile-status").textContent = "Não foi possível carregar este perfil agora.";
    }
}

document.getElementById("share-profile").addEventListener("click", copyProfileLink);
loadProfile();
