const apiUrl = "/api";
const redirectNoUser = "../intro/index.html";
let userId;
let authToken;

const statusMessage = (message, error = false) => {
    const status = document.getElementById("status");
    status.textContent = message;
    status.classList.toggle("error", error);
};

async function request(url, options) {
    const headers = {
        ...(options?.headers || {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };
    const response = await fetch(url, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível salvar as alterações.");
    return body;
}

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

async function iniciarSessao() {
    const config = await fetch(`${apiUrl}/config`).then((response) => response.json());
    if (!config.clerkPublishableKey) throw new Error("A autenticação ainda não está configurada.");

    const clerkDomain = atob(config.clerkPublishableKey.split("_")[2]).slice(0, -1);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await carregarScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        "data-clerk-publishable-key": config.clerkPublishableKey,
    });
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });

    if (!window.Clerk.user || !window.Clerk.session) {
        window.location.href = redirectNoUser;
        return false;
    }

    userId = window.Clerk.user.id;
    authToken = await window.Clerk.session.getToken();
    return true;
}

async function loadProfile() {
    if (!userId) {
        window.location.href = redirectNoUser;
        return;
    }

    try {
        const users = await request(`${apiUrl}/usuario/id/${encodeURIComponent(userId)}`);
        const user = users[0];
        if (!user) throw new Error("Perfil não encontrado.");

        document.getElementById("nome").textContent = user.nome;
            document.getElementById("avatar").src = user.image_perfil || "/front-end/intro/img/fds.png";
        document.getElementById("titulo").value = user.titulo || "";
        document.getElementById("bio").value = user.bio || "";
        document.getElementById("subtitle").textContent = user.titulo || "Atualize como as pessoas encontram você.";

        const redes = await request(`${apiUrl}/redes/${encodeURIComponent(user.nome)}`);
        const rede = redes[0] || {};
        document.getElementById("instagram").value = rede.instagram || "";
        document.getElementById("youtube").value = rede.youtube || "";
        document.getElementById("spotify").value = rede.spotify || "";
        document.getElementById("tiktok").value = rede.tiktok || "";
    } catch (error) {
        statusMessage(error.message, true);
    }
}

document.getElementById("bio-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
        await request(`${apiUrl}/bio`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, titulo: document.getElementById("titulo").value.trim(), bio: document.getElementById("bio").value.trim() }) });
        document.getElementById("subtitle").textContent = document.getElementById("titulo").value.trim() || "Atualize como as pessoas encontram você.";
        statusMessage("Informações salvas.");
    } catch (error) { statusMessage(error.message, true); } finally { button.disabled = false; }
});

document.getElementById("redes-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
        for (const tipo of ["instagram", "youtube", "spotify", "tiktok"]) {
            const link = document.getElementById(tipo).value.trim();
            if (link) await request(`${apiUrl}/redes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, tipo, link }) });
        }
        statusMessage("Redes sociais salvas.");
    } catch (error) { statusMessage(error.message, true); } finally { button.disabled = false; }
});



const trackForm = document.getElementById("track-form");
const tracksList = document.getElementById("tracks-list");

trackForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("track-name").value.trim();
    const type = document.getElementById("track-type").value;
    const capaInput = document.getElementById("track-cover");
    const capa = capaInput.files[0];
    const audio = document.getElementById("track-audio").value.trim();
    const preview = document.getElementById("track-preview").files[0];

    if (!name || !capa || !audio || !preview) {
        statusMessage("Preencha os campos e envie uma prévia de áudio.", true);
        return;
    }

    const duracao = await validarPrevia(preview);
    if (duracao === null) return;

    const year = new Date().getFullYear();

    const formData = new FormData();

    formData.append("cover", capa);
    formData.append("user_id", userId);
    formData.append("name", name);
    formData.append("type", type);
    formData.append("audio", audio);
    formData.append("preview", preview);
    formData.append("duration", duracao);
    formData.append("year", year);

    try {
        const button = event.submitter;
        button.disabled = true;

        await request(`${apiUrl}/beats`, {
            method: "POST",
            body: formData
        });

        statusMessage("Track adicionado com sucesso.");

        trackForm.reset();

        loadTracks();

    } catch (error) {
        statusMessage(error.message, true);
    } finally {
        event.submitter.disabled = false;
    }
});

async function loadTracks() {
    try {
        const users = await request(`${apiUrl}/usuario/id/${encodeURIComponent(userId)}`);
        const beats = (await request(`${apiUrl}/beats/${encodeURIComponent(users[0].nome)}`))[0];

        tracksList.innerHTML = "";

        if (!beats || !beats.beats || Object.keys(beats.beats).length === 0) {
            tracksList.innerHTML = "<p>Nenhum track cadastrado.</p>";
            return;
        }

        Object.entries(beats.beats).forEach(([name, data]) => {
            const [audio, ano, tipo, imagem, preview, duracao] = data;

            const article = document.createElement("article");
            article.className = "track";

            article.innerHTML = `
        <img src="${imagem || "/front-end/intro/img/fds.png"}" onerror="this.onerror=null;this.src='/front-end/intro/img/fds.png'" alt="${name}">
        
        <div class="track-info">
            <h3>${name}</h3>
            <p>${tipo} • ${ano}</p>
        </div>

        <div class="edit-area" style="display:none;">
            <input class="edit-name" value="${name}">
            
            <select class="edit-type">
                <option ${tipo === "Música" ? "selected" : ""}>Música</option>
                <option ${tipo === "projeto" ? "selected" : ""}>Projeto</option>
                <option ${tipo === "fotografia" ? "selected" : ""}>Fotografia</option>
                <option ${tipo === "Outro" ? "selected" : ""}>Outro</option>
            </select>

            <input type="file" class="edit-cover" value="${imagem}">
            <input class="edit-audio" value="${audio}">

            <button class="save-edit">
                💾
            </button>
        </div>

        ${preview ? `<audio class="track-preview" controls preload="none" src="${preview}"></audio>` : `<button class="play-track" onclick="encaminhar('${audio}')">▶</button>`}

        <button class="edit-track">
            ✏️
        </button>
        <button class="edit-track delete-track" data-name="${name}">
            🗑️
        </button>
    `;


            const editButton = article.querySelector(".edit-track");
            const editArea = article.querySelector(".edit-area");
            const info = article.querySelector(".track-info");
            const saveButton = article.querySelector(".save-edit");
            const deleteButton = article.querySelector(".delete-track");

            editButton.addEventListener("click", async () => {
                if (editArea.style.display === "none") {
                    editArea.style.display = "block";
                    editButton.textContent = "❌";
                } else {
                    editArea.style.display = "none";
                    editButton.textContent = "✏️";
                }

                const resposta = await fetch(imagem);
                const blob = await resposta.blob();

                const arquivo = new File([blob], "imagem.png", {
                    type: blob.type
                });

                const newCover = article.querySelector(".edit-cover");
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(arquivo);

                newCover.files = dataTransfer.files;

            });

            deleteButton.addEventListener("click", async () => {
                const users = await request(`${apiUrl}/usuario/id/${encodeURIComponent(userId)}`);
                const beatsResponse = await request(`${apiUrl}/beats/${encodeURIComponent(users[0].nome)}`);

                const beats = beatsResponse[0].beats;

                delete beats[name];

                await request(`${apiUrl}/beats`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        list: beats
                    })
                });

                statusMessage("Track apagado.");
                loadTracks();
            });

            saveButton.addEventListener("click", async () => {

                const newName = article.querySelector(".edit-name").value.trim();
                const newType = article.querySelector(".edit-type").value;
                const newCover = article.querySelector(".edit-cover").files[0];
                const newAudio = article.querySelector(".edit-audio").value.trim();

                if (!newName || !newCover || !newAudio) {
                    statusMessage("Preencha todos os campos.", true);
                    return;
                }

                const formData = new FormData();
                formData.append("user_id", userId);
                formData.append("name", newName);
                formData.append("type", newType);
                formData.append("audio", newAudio);
                formData.append("year", ano);
                formData.append("cover", newCover);
                if (duracao) formData.append("duration", duracao);

                await request(`${apiUrl}/beats`, {
                    method: "POST",
                    body: formData
                });

                statusMessage("Track atualizado.");

                if (editArea.style.display === "none") {
                    editArea.style.display = "block";
                    editButton.textContent = "❌";
                } else {
                    editArea.style.display = "none";
                    editButton.textContent = "✏️";
                }
                loadTracks();
            });


            tracksList.appendChild(article);
        });
    } catch (error) {
        console.error(error);
    }
}

function encaminhar(link) {
    if (!link) return;
    window.location.href = link;
};

function validarPrevia(arquivo) {
    return new Promise((resolve) => {
        const audio = document.createElement("audio");
        const url = URL.createObjectURL(arquivo);
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            const duracao = audio.duration;
            if (!Number.isFinite(duracao) || duracao < 15 || duracao > 30) {
                statusMessage("A prévia precisa ter entre 15 e 30 segundos.", true);
                resolve(null);
                return;
            }
            resolve(Math.round(duracao));
        };
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            statusMessage("Não foi possível ler a prévia de áudio.", true);
            resolve(null);
        };
        audio.src = url;
    });
}

document.getElementById("arquivo").addEventListener("change", async function () {
    const arquivo = this.files[0];

    if (!arquivo) return;

    const formData = new FormData();
    formData.append("avatar", arquivo);
    formData.append("user_id", userId);

    try {
        const resultado = await request("/api/usuario/upload-avatar", {
            method: "POST",
            body: formData

        });

        console.log(resultado);

    } catch (err) {
        alert(err.message);
    }
    // Aqui você faz o upload
});

function uploadImage() {
    document.getElementById("arquivo").click();
}

iniciarSessao().then((autenticado) => {
    if (!autenticado) return;
    loadTracks();
    loadProfile();
}).catch((error) => statusMessage(error.message, true));

const inputCover = document.querySelector("#track-cover");
const preview = document.querySelector("#cover-preview");
const content = document.querySelector(".upload-content");


inputCover.addEventListener("change", () => {

    const arquivo = inputCover.files[0];


    if(!arquivo) return;


    if(!arquivo.type.startsWith("image/")){
        alert("Escolha uma imagem válida");
        return;
    }


    const url = URL.createObjectURL(arquivo);


    preview.src = url;

    preview.style.display = "block";

    content.style.display = "none";

});