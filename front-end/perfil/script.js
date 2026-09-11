const defaultAvatar = "/front-end/intro/img/fds.png";
const storageKey = "fora-do-site-profile";
const categoryStorageKey = "fora-do-site-category";
const apiBase = window.location.protocol === "file:" || ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) && window.location.port !== "3000"
    ? "http://localhost:3000/api"
    : "/api";
const storedCategory = localStorage.getItem(categoryStorageKey) || "Música";
const storedProfileType = localStorage.getItem("fora-do-site-profile-type") || "Artista";
const profileCategory = storedCategory === "Música" ? storedProfileType : storedCategory;
let profileState = loadState();
let pendingAvatarUrl = null;

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(storageKey)) || { tracks: [], socials: {}, projects: [] };
    } catch {
        return { tracks: [], socials: {}, projects: [] };
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

async function syncFeaturedProfile() {
    if (!profileState.name) return;
    try {
        const response = await fetch(`${apiBase}/usuario/destaques`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome: profileState.name,
                titulo: profileState.role,
                bio: profileState.bio,
                image_perfil: profileState.avatarUrl,
            }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error("Não foi possível publicar o perfil nos destaques:", error);
    }
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
    configurePortfolio();
    renderTracks();
    renderProjects();
}

function categoryKey() {
    return profileCategory.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function configurePortfolio() {
    const key = categoryKey();
    const section = document.getElementById("portfolio-section");
    const tracksSection = document.getElementById("tracks-section");
    const projectsSection = document.getElementById("projects-section");
    const publicTracks = document.querySelector(".public-tracks");
    const form = document.getElementById("portfolio-form");
    const note = document.getElementById("portfolio-note");
    document.querySelector(".public-type").textContent = profileCategory.toUpperCase();
    form.replaceChildren();
    section.hidden = false;
    tracksSection.hidden = !["artista", "musica"].includes(key);
    publicTracks.hidden = tracksSection.hidden;
    projectsSection.hidden = key !== "projetos";

    if (["artista", "musica", "projetos"].includes(key)) {
        section.hidden = true;
        return;
    }

    if (key === "beatmaker") {
        document.getElementById("portfolio-title").textContent = "Contato profissional";
        note.textContent = "Informe apenas os canais para contratar ou falar com você. A plataforma não comercializa beats.";
        form.innerHTML = `<label for="beatmaker-email">E-mail</label><input id="beatmaker-email" type="email" maxlength="160" placeholder="contato@exemplo.com" required><label for="beatmaker-phone">Celular</label><input id="beatmaker-phone" type="tel" maxlength="25" placeholder="(00) 00000-0000"><button class="primary-button" type="submit">Salvar contato</button>`;
        setValue("beatmaker-email", profileState.beatmaker?.email || "");
        setValue("beatmaker-phone", profileState.beatmaker?.phone || "");
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            profileState.beatmaker = { email: document.getElementById("beatmaker-email").value.trim(), phone: document.getElementById("beatmaker-phone").value.trim() };
            saveState();
            showStatus("Contato do beatmaker salvo.");
        });
        return;
    }

    const portfolioConfig = {
        danca: { title: "Vídeos de dança", note: "Adicione vídeos de 15 a 30 segundos.", type: "video", max: 3 },
        audiovisual: { title: "Vídeos do portfólio", note: "Adicione vídeos de 15 a 30 segundos.", type: "video", max: 3 },
        moda: { title: "Fotos do portfólio", note: "Adicione até cinco fotos do seu trabalho.", type: "image", max: 5 },
        "artes visuais": { title: "Obras visuais", note: "Adicione até cinco fotos das suas obras.", type: "image", max: 5 },
        literatura: { title: "Livros e poesias", note: "Anexe PDFs de livros ou poesias.", type: "pdf", max: 5 },
    }[key];
    if (!portfolioConfig) {
        section.hidden = true;
        return;
    }
    document.getElementById("portfolio-title").textContent = portfolioConfig.title;
    note.textContent = portfolioConfig.note;
    const accept = { video: "video/mp4,video/webm,video/quicktime", image: "image/jpeg,image/png,image/webp", pdf: "application/pdf" }[portfolioConfig.type];
    form.innerHTML = `<label for="portfolio-title-input">Nome ou título</label><input id="portfolio-title-input" maxlength="120" placeholder="Dê um nome ao trabalho" required><label for="portfolio-file">Arquivo <small>${portfolioConfig.type === "video" ? "15–30s" : `até ${portfolioConfig.max} arquivos`}</small></label><input id="portfolio-file" type="file" accept="${accept}" ${portfolioConfig.type === "image" || portfolioConfig.type === "pdf" ? "multiple" : ""} required><button class="primary-button" type="submit">Adicionar ao portfólio</button>`;
    const items = profileState.portfolio || [];
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = document.getElementById("portfolio-title-input").value.trim();
        const files = [...document.getElementById("portfolio-file").files];
        if (!files.length || items.length + files.length > portfolioConfig.max) {
            showStatus(`Você pode adicionar no máximo ${portfolioConfig.max} itens.`, true);
            return;
        }
        const button = event.submitter;
        button.disabled = true;
        for (const file of files) {
            if (portfolioConfig.type === "video") {
                const duration = await readMediaDuration(file);
                if (duration === null || duration < 15 || duration > 30) {
                    showStatus("Cada vídeo precisa ter entre 15 e 30 segundos.", true);
                    button.disabled = false;
                    return;
                }
            }
            items.push({ title, type: portfolioConfig.type, name: file.name, url: await readFileAsDataUrl(file) });
        }
        profileState.portfolio = items;
        saveState();
        renderPortfolioItems(portfolioConfig);
        event.target.reset();
        button.disabled = false;
        showStatus("Item adicionado ao portfólio.");
    });
    renderPortfolioItems(portfolioConfig);
}

function renderPortfolioItems(config) {
    const list = document.getElementById("portfolio-list");
    list.replaceChildren();
    (profileState.portfolio || []).forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "portfolio-item";
        card.innerHTML = `<div><strong></strong><small></small></div><button class="track-remove" type="button" aria-label="Remover item">×</button>`;
        card.querySelector("strong").textContent = item.title;
        card.querySelector("small").textContent = item.name;
        card.querySelector(".track-remove").addEventListener("click", () => {
            profileState.portfolio.splice(index, 1);
            saveState();
            renderPortfolioItems(config);
        });
        list.appendChild(card);
    });
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

function renderProjects() {
    const editorList = document.getElementById("project-list");
    const publicList = document.getElementById("public-projects-list");
    const projects = profileState.projects || [];
    editorList.replaceChildren();
    publicList.replaceChildren();
    document.getElementById("project-count").textContent = `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`;

    if (!projects.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Seus projetos aparecerão aqui.";
        publicList.appendChild(empty);
        return;
    }

    const projectLabels = { edital: "Edital", show: "Show", batalha: "Batalha" };
    projects.forEach((project, index) => {
        const editorProject = document.createElement("article");
        editorProject.className = "editor-project";
        editorProject.innerHTML = `<img src="${project.logoUrl}" alt=""><div><strong></strong><small></small></div><button class="track-remove" type="button" aria-label="Remover projeto">×</button>`;
        editorProject.querySelector("strong").textContent = projectLabels[project.type];
        editorProject.querySelector("small").textContent = project.description;
        editorProject.querySelector(".track-remove").addEventListener("click", () => {
            profileState.projects.splice(index, 1);
            saveState();
            renderProjects();
            showStatus("Projeto removido.");
        });
        editorList.appendChild(editorProject);

        const publicProject = document.createElement("article");
        publicProject.className = "public-project";
        publicProject.innerHTML = `<img src="${project.logoUrl}" alt=""><div><span></span><p></p><small></small></div>`;
        publicProject.querySelector("span").textContent = projectLabels[project.type];
        publicProject.querySelector("p").textContent = project.description;
        const details = project.type === "show"
            ? [project.email, project.phoneOne, project.phoneTwo].filter(Boolean).join(" | ")
            : project.type === "batalha"
                ? [formatDate(project.date), project.time, project.location].filter(Boolean).join(" | ")
                : "PDF do edital disponível";
        publicProject.querySelector("small").textContent = details;
        if (project.type === "edital" && project.pdfUrl) {
            const pdfLink = document.createElement("a");
            pdfLink.href = project.pdfUrl;
            pdfLink.target = "_blank";
            pdfLink.rel = "noreferrer";
            pdfLink.textContent = "Abrir edital em PDF";
            publicProject.querySelector("div").appendChild(pdfLink);
        }
        publicList.appendChild(publicProject);
    });
}

function formatDate(value) {
    if (!value) return "";
    return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
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

function readMediaDuration(file) {
    return new Promise((resolve) => {
        const media = document.createElement("video");
        const objectUrl = URL.createObjectURL(file);
        media.preload = "metadata";
        media.onloadedmetadata = () => {
            const duration = media.duration;
            URL.revokeObjectURL(objectUrl);
            resolve(Number.isFinite(duration) ? duration : null);
        };
        media.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
        };
        media.src = objectUrl;
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
    syncFeaturedProfile();
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

const projectType = document.getElementById("project-type");
const projectFields = document.querySelectorAll("[data-project-fields]");

function updateProjectFields() {
    projectFields.forEach((fields) => {
        fields.hidden = fields.dataset.projectFields !== projectType.value;
    });
    document.getElementById("project-pdf").required = projectType.value === "edital";
}

projectType.addEventListener("change", updateProjectFields);
updateProjectFields();

document.getElementById("project-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const type = projectType.value;
    const logoFile = document.getElementById("project-logo").files[0];
    const pdfFile = document.getElementById("project-pdf").files[0];
    if (!logoFile || (type === "edital" && (!pdfFile || pdfFile.type !== "application/pdf"))) return;
    if (type === "show" && !document.getElementById("project-email").value.trim()) {
        showStatus("Informe o e-mail de contato do show.", true);
        return;
    }
    if (type === "batalha" && (!document.getElementById("project-date").value || !document.getElementById("project-time").value || !document.getElementById("project-location").value.trim())) {
        showStatus("Informe data, horário e local da batalha.", true);
        return;
    }

    button.disabled = true;
    const project = {
        type,
        description: document.getElementById("project-description").value.trim(),
        logoUrl: await readFileAsDataUrl(logoFile),
    };
    if (type === "show") {
        project.email = document.getElementById("project-email").value.trim();
        project.phoneOne = document.getElementById("project-phone-one").value.trim();
        project.phoneTwo = document.getElementById("project-phone-two").value.trim();
    } else if (type === "batalha") {
        project.date = document.getElementById("project-date").value;
        project.time = document.getElementById("project-time").value;
        project.location = document.getElementById("project-location").value.trim();
    } else {
        project.pdfUrl = await readFileAsDataUrl(pdfFile);
    }
    profileState.projects = profileState.projects || [];
    profileState.projects.push(project);
    saveState();
    renderProjects();
    event.target.reset();
    projectType.value = type;
    updateProjectFields();
    button.disabled = false;
    showStatus("Projeto adicionado ao seu perfil.");
});

renderProfile();
