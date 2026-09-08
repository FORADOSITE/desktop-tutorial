
function get_social_tag(tipo, link) {
    const url = "/front-end/intro/img/fds.png";

    const rede_social_tag =
        `
            <div class="rede-social" onclick="encaminhar('${link}')">
                <img src="${url}" alt="${tipo}">
                <p>${tipo}</p>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </div>
    `
    return rede_social_tag
}

function get_beats_tag(name, list) {
    const link = list[0]
    const ano = list[1]
    const tipo = list[2]
    const image = list[3]
    const preview = list[4]
    const beats_tag =
        `
        <article class="track">
            <img class="track-img" src="${image || "/front-end/intro/img/fds.png"}" onerror="this.onerror=null;this.src='/front-end/intro/img/fds.png'" alt="${name}">
            <div>
                <h3>${name}</h3><p>${tipo} • ${ano}</p>
            </div>
            ${preview ? `<audio controls preload="none" src="${preview}" aria-label="Prévia de ${name}"></audio>` : `<button onclick="encaminhar('${link}')" aria-label="Abrir ${name}">▶</button>`}
        </article>
    `
    return beats_tag
}

function encaminhar(link) {
    if (!link) return
    window.location.href = link
}

function selected(button) {
    // Remove the 'selected' class from all buttons
    const buttons = document.querySelectorAll('nav button');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
    });

    // Add the 'selected' class to the clicked button
    button.classList.add('selected');
}