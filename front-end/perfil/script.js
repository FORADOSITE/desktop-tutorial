const defaultAvatar = "/front-end/intro/img/fds.png";
const storageKey = "fora-do-site-profile";
let profileState = loadState();
let pendingAvatarUrl = null;

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(storageKey)) || { tracks: [], socials: {} };
    } catch {
        return { tracks: [], socials: {} };
    }
}

function saveState() {
    const stateForStorage = { ...profileState, tracks: profileState.tracks.map(({ previewUrl, coverUrl, ...track }) => track) };
    localStorage.setItem(storageKey, JSON.stringify(stateForStorage));
}

function showStatus(message, error = false) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.classList.toggle("error", error);
}

function setValue(id, value = "") {
    document.getElementById(id).value = value;
}

function renderProfile() {
    const name = profileState.name || "Seu nome";
    const role = profileState.role || "Seu título aparece aqui";
    const bio = profileState.bio || "Sua bio vai aparecer aqui quando você começar a escrever.";
    document.getElementById("profile-name").value = profileState.name || "";
    document.getElementById("profile-role").value = profileState.role || "";
    document.getElementById("profile-bio").value = profileState.bio || "";
    document.getElementById("public-name").textContent = name;
    document.getElementById("public-role").textContent = role;
    document.getElementById("public-bio").textContent = bio;
    document.getElementById("public-avatar").src = profileState.avatarUrl || defaultAvatar;
    document.getElementById("avatar-preview").src = profileState.avatarUrl || defaultAvatar;

    ["instagram", "youtube", "spotify"].forEach((network) => setValue(network, profileState.socials?.[network] || ""));
    renderSocials();
    renderTracks();
}

function renderSocials() {
    const container = document.getElementById("social-links");
    const socials = profileState.socials || {};
    const labels = { instagram: "Instagram", youtube: "YouTube", spotify: "Spotify" };
    container.replaceChildren();
    Object.entries(labels).forEach(([network, label]) => {
        const link = socials[network];
        if (!link) return;
        const anchor = document.createElement("a");
        anchor.href = link;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = label;
        container.appendChild(anchor);
    });
}

function renderTracks() {
    const editorList = document.getElementById("track-list");
    const publicList = document.getElementById("public-tracks-list");
    const tracks = profileState.tracks || [];
    editorList.replaceChildren();
    publicList.replaceChildren();
    document.getElementById("track-count").textContent = `${tracks.length} ${tracks.length === 1 ? "faixa" : "faixas"}`;

    if (!tracks.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Suas músicas aparecerão aqui.";
        publicList.appendChild(empty);
        return;
    }

    tracks.forEach((track, index) => {
        const editorTrack = document.createElement("article");
        editorTrack.className = "editor-track";
        editorTrack.innerHTML = `<img src="${track.coverUrl || defaultAvatar}" alt=""><div class="track-copy"><strong></strong><small>${track.duration}s de prévia</small></div><button class="track-remove" type="button" aria-label="Remover prévia">×</button>`;
        editorTrack.querySelector("strong").textContent = track.title;
        editorTrack.querySelector(".track-remove").addEventListener("click", () => {
            profileState.tracks.splice(index, 1);
            saveState();
            renderTracks();
            showStatus("Prévia removida.");
        });
        editorList.appendChild(editorTrack);

        const publicTrack = document.createElement("article");
        publicTrack.className = "public-track";
        publicTrack.innerHTML = `<img src="${track.coverUrl || defaultAvatar}" alt=""><div><strong></strong><audio controls preload="metadata" src="${track.previewUrl || ""}"></audio></div>`;
        publicTrack.querySelector("strong").textContent = track.title;
        publicList.appendChild(publicTrack);
    });
}

function validateUrl(value, fieldName) {
    if (!value) return true;
    try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        return true;
    } catch {
        showStatus(`Informe um link válido para ${fieldName}.`, true);
        return false;
    }
}

function readAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = document.createElement("audio");
        const objectUrl = URL.createObjectURL(file);
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
            const duration = audio.duration;
            URL.revokeObjectURL(objectUrl);
            resolve(Number.isFinite(duration) ? duration : null);
        };
        audio.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
        };
        audio.src = objectUrl;
    });
}

function readImageUrl(file) {
    return file ? URL.createObjectURL(file) : null;
}

document.getElementById("avatar-button").addEventListener("click", () => document.getElementById("avatar-input").click());
document.getElementById("avatar-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    pendingAvatarUrl = readImageUrl(file);
    profileState.avatarUrl = pendingAvatarUrl;
    document.getElementById("avatar-preview").src = pendingAvatarUrl;
    document.getElementById("public-avatar").src = pendingAvatarUrl;
    saveState();
    showStatus("Foto de perfil atualizada.");
});

document.getElementById("identity-form").addEventListener("submit", (event) => {
    event.preventDefault();
    profileState.name = document.getElementById("profile-name").value.trim();
    profileState.role = document.getElementById("profile-role").value.trim();
    profileState.bio = document.getElementById("profile-bio").value.trim();
    saveState();
    renderProfile();
    showStatus("Identidade salva.");
});

document.getElementById("social-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const networks = { instagram: "Instagram", youtube: "YouTube", spotify: "Spotify" };
    for (const [network, label] of Object.entries(networks)) {
        const value = document.getElementById(network).value.trim();
        if (!validateUrl(value, label)) return;
        profileState.socials[network] = value;
    }
    saveState();
    renderSocials();
    showStatus("Links sociais salvos.");
});

document.getElementById("track-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const title = document.getElementById("track-title").value.trim();
    const link = document.getElementById("track-link").value.trim();
    const previewFile = document.getElementById("track-preview").files[0];
    const coverFile = document.getElementById("track-cover").files[0];
    if (!validateUrl(link, "a música") || !previewFile) return;

    button.disabled = true;
    const duration = await readAudioDuration(previewFile);
    if (duration === null || duration < 15 || duration > 30) {
        showStatus("A prévia precisa ter entre 15 e 30 segundos.", true);
        button.disabled = false;
        return;
    }

    profileState.tracks.push({
        title,
        link,
        duration: Math.round(duration),
        coverUrl: readImageUrl(coverFile),
        previewUrl: readImageUrl(previewFile),
    });
    saveState();
    renderTracks();
    event.target.reset();
    button.disabled = false;
    showStatus("Prévia adicionada ao seu perfil.");
});

renderProfile();
