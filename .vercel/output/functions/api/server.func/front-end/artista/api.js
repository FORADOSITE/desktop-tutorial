

const api_url = "/api"
const redirect_No_user = "../intro/index.html"

async function getName(id) {
    const response = await fetch(`${api_url}/usuario/id/${id}`);

    if (response.status === 200) {
        const user = await response.json();
        return user[0].nome;
    } else {
        document.cookie = "";
        window.location.href = redirect_No_user;
        return null;
    }
}

const params = new URLSearchParams(window.location.search)
const nome = params.get('nome')
if (nome) {
    // mudar nome
    fetch(`${api_url}/usuario/${encodeURIComponent(nome)}`)
        .then(async (response) => {
            if (response.status == 200) {
                let dado = await response.json()
                dado = dado[0]
                const p_nome = document.querySelector('.nome')
                if (p_nome) {
                    p_nome.textContent = dado.nome
                }
                const p_titulo = document.querySelector('#titulo')
                if (p_titulo) {
                    p_titulo.textContent = dado.titulo || "Conheça os trabalhos deste artista."
                }
                const bio = document.querySelector('#bio')
                if (bio) {
                    bio.textContent = dado.bio || "Este artista ainda não adicionou uma biografia."
                }

                const avatar_img = document.querySelector('#artist-avatar')
                    if (avatar_img) {
                        avatar_img.src = dado.image_perfil || "/front-end/intro/img/fds.png";
                        avatar_img.onerror = () => {
                            avatar_img.onerror = null;
                            avatar_img.src = "/front-end/intro/img/fds.png";
                        };
                }
            } else {
                window.location.href = redirect_No_user
            }
        })

    if (document.cookie == "") {
        document.getElementById("meu_perfil").textContent = "Entrar"
        document.getElementById("meu_perfil").href = "../login/index.html"
    } else {
        (async () => {
            let id = document.cookie.split("; ")[0].split("=")[1];
            const nomenovo = await getName(id);
            if (nomenovo == nome) {
                document.getElementById("editar_perfil").classList.remove("hidden")
            }
        })();
    }
    fetch(`${api_url}/redes/${encodeURIComponent(nome)}`)
        .then(async (response) => {
            if (response.status == 200) {
                let dado = await response.json()
                dado = dado[0]
                const div_redes_sociais = document.querySelector('.redes-sociais')
                if (!dado || !div_redes_sociais) return

                div_redes_sociais.innerHTML = ""
                let possuiRede = false

                for (const tipo of ["instagram", "youtube", "spotify", "tiktok"]) {
                    if (dado[tipo]) {
                        possuiRede = true
                        div_redes_sociais.innerHTML += get_social_tag(tipo, dado[tipo])
                    }
                }
                if (!possuiRede) {
                    div_redes_sociais.innerHTML = '<p class="empty-social">Nenhuma rede social adicionada ainda.</p>'
                }
            }
        })

    fetch(`${api_url}/beats/${encodeURIComponent(nome)}`)
        .then(async (response) => {
            if (response.status == 200) {
                let dado = await response.json()
                dado = dado[0]
                const div_beats = document.querySelector('.track-list')
                if (!dado || !div_beats) return

                div_beats.innerHTML = ""
                let possuiBeats = false

                for (const [name, list] of Object.entries(dado.beats)) {
                    possuiBeats = true
                    div_beats.innerHTML += get_beats_tag(name, list)
                }
                if (!possuiBeats) {
                    div_beats.innerHTML = '<p class="empty-beats">Nenhum beat adicionado ainda.</p>'
                }
            }
        });
} else {
    if (document.cookie == "") {
        window.location.href = redirect_No_user
    }
    (async () => {
        let id = document.cookie.split("; ")[0].split("=")[1];
        const nome = await getName(id);

        if (nome) {
            window.location.href = "./index.html?nome=" + nome;
        }
    })();
}
