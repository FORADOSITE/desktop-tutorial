/* =========================================================
   FORA DO SITE
   SCRIPT.JS
   ========================================================= */

/* =========================================================
    0. VARIÁVEIS GLOBAIS   
   ========================================================= */

const apiURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";


/* =========================================================
   1. ELEMENTOS PRINCIPAIS
   ========================================================= */

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const mainNav =
    document.querySelector(".main-nav");

const searchInput =
    document.getElementById("searchInput");

const artistsGrid =
    document.getElementById("artistsGrid");

const categoryList =
    document.getElementById("categoryList");

const servicesGrid =
    document.getElementById("servicesGrid");

const newsletterForm =
    document.getElementById("newsletterForm");

if (servicesGrid) {
    fetch(`${apiURL}/servicos`)
        .then((response) => {
            if (!response.ok) throw new Error("Falha ao carregar serviços");
            return response.json();
        })
        .then((servicos) => {
            servicesGrid.innerHTML = "";

            if (!Array.isArray(servicos) || servicos.length === 0) {
                servicesGrid.innerHTML = '<p class="empty-services">Nenhum serviço cadastrado ainda.</p>';
                return;
            }

            servicos.forEach((servico) => {
                const card = document.createElement("article");
                card.className = "service-card";
                const titulo = servico.title || servico.titulo || servico.name || servico.nome || "Serviço";
                const descricao = servico.description || servico.descricao || servico.text || "Conheça este serviço disponível na plataforma.";
                const heading = document.createElement("h3");
                const paragraph = document.createElement("p");
                heading.textContent = titulo;
                paragraph.textContent = descricao;
                card.append(heading, paragraph);
                servicesGrid.appendChild(card);
            });
        })
        .catch((error) => {
            console.error("Erro ao carregar serviços:", error);
            servicesGrid.innerHTML = '<p class="empty-services">Não foi possível carregar os serviços agora.</p>';
        });
}


/* =========================================================
   2. MENU MOBILE
   ========================================================= */

if (
    mobileMenuButton &&
    mainNav
) {

    mobileMenuButton.addEventListener(
        "click",
        () => {

            mainNav.classList.toggle(
                "mobile-active"
            );

            mobileMenuButton.classList.toggle(
                "active"
            );

        }
    );

}


/* =========================================================
   3. FECHAR MENU MOBILE AO CLICAR
   ========================================================= */

const navLinks =
    document.querySelectorAll(
        ".nav-link"
    );


navLinks.forEach(
    (link) => {

        link.addEventListener(
            "click",
            () => {

                if (
                    window.innerWidth <= 768
                ) {

                    mainNav.classList.remove(
                        "mobile-active"
                    );

                    mobileMenuButton.classList.remove(
                        "active"
                    );

                }

            }
        );

    }
);


/* =========================================================
   4. NAVEGAÇÃO SUAVE
   ========================================================= */

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach(
        (anchor) => {

            anchor.addEventListener(
                "click",
                function (event) {

                    const targetId =
                        this.getAttribute(
                            "href"
                        );

                    if (
                        targetId === "#"
                    ) {

                        event.preventDefault();

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                        return;

                    }


                    const target =
                        document.querySelector(
                            targetId
                        );


                    if (target) {

                        event.preventDefault();

                        const headerHeight =
                            document
                                .querySelector(
                                    ".header"
                                )
                                ?.offsetHeight || 0;


                        const targetPosition =
                            target.offsetTop -
                            headerHeight;


                        window.scrollTo({

                            top:
                                targetPosition,

                            behavior:
                                "smooth"

                        });

                    }

                }
            );

        }
    );


/* =========================================================
   5. MENU ATIVO CONFORME SCROLL
   ========================================================= */

const sections =
    document.querySelectorAll(
        "main section[id]"
    );


function updateActiveNavigation() {

    const scrollPosition =
        window.scrollY +
        150;


    sections.forEach(
        (section) => {

            const sectionTop =
                section.offsetTop;

            const sectionHeight =
                section.offsetHeight;

            const sectionId =
                section.getAttribute(
                    "id"
                );


            if (
                scrollPosition >=
                sectionTop &&

                scrollPosition <=
                sectionTop +
                sectionHeight
            ) {

                navLinks.forEach(
                    (link) => {

                        link.classList.remove(
                            "active"
                        );

                    }
                );


                const activeLink =
                    document.querySelector(
                        `.nav-link[href="#${sectionId}"]`
                    );


                if (
                    activeLink
                ) {

                    activeLink.classList.add(
                        "active"
                    );

                }

            }

        }
    );

}


window.addEventListener(
    "scroll",
    updateActiveNavigation
);


/* =========================================================
   6. BUSCA DE ARTISTAS
   ========================================================= */

/* =========================================================
    6.1 - FILTRAR ARTISTAS
   ========================================================= */

fetch(`${apiURL}/usuario/destaques`)
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Falha ao carregar destaques: HTTP ${response.status}`);
        }
        return response.json();
    })
    .then((data) => {
        artistsGrid.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            artistsGrid.innerHTML = '<p class="empty-artists">Ainda não há artistas cadastrados.</p>';
            return;
        }

        data.forEach((usuario) => {
            const article = document.createElement("article");
            article.className = "artist-card";

            article.innerHTML = `
                <div class="artist-image">
                    <img src="${usuario.image_perfil || "/front-end/intro/img/fds.png"}" onerror="this.onerror=null;this.src='/front-end/intro/img/fds.png'" alt="${usuario.nome}">
                    <span class="artist-tag">ARTISTA</span>
                </div>
                <div class="artist-info">
                    <h3>${usuario.nome || "Artista"}</h3>
                    <p>${usuario.titulo || "Artista independente"}</p>
                </div>
            `;

            article.addEventListener("click", () => {
                window.location.href = `../artista/index.html?nome=${encodeURIComponent(usuario.nome)}`;
            });

            artistsGrid.appendChild(article);
            observeRevealElement(article);
        });
    })
    .catch((error) => {
        console.error("Erro ao carregar destaques:", error);
        artistsGrid.innerHTML = '<p class="empty-artists">Não foi possível carregar os artistas agora.</p>';
    });

if (
    searchInput &&
    artistsGrid
) {

    searchInput.addEventListener(
        "input",
        function () {

            const searchTerm =
                this.value
                    .toLowerCase()
                    .trim();


            const artistCards =
                artistsGrid.querySelectorAll(
                    ".artist-card"
                );


            artistCards.forEach(
                (card) => {

                    const artistName =
                        card
                            .querySelector(
                                "h3"
                            )
                            ?.textContent
                            .toLowerCase() || "";


                    const artistCategory =
                        card
                            .querySelector(
                                "p"
                            )
                            ?.textContent
                            .toLowerCase() || "";


                    const matches =
                        artistName.includes(
                            searchTerm
                        ) ||

                        artistCategory.includes(
                            searchTerm
                        );


                    if (
                        matches
                    ) {

                        card.style.display =
                            "";

                    } else {

                        card.style.display =
                            "none";

                    }

                }
            );


            showSearchMessage(
                searchTerm
            );

        }
    );

}


/* =========================================================
   7. MENSAGEM DE BUSCA
   ========================================================= */

function showSearchMessage(
    searchTerm
) {

    if (
        !artistsGrid
    ) {

        return;

    }


    let message =
        document.getElementById(
            "searchMessage"
        );


    const visibleCards =
        Array.from(
            artistsGrid.querySelectorAll(
                ".artist-card"
            )
        ).filter(
            (card) =>
                card.style.display !==
                "none"
        );


    if (
        searchTerm &&
        visibleCards.length === 0
    ) {

        if (
            !message
        ) {

            message =
                document.createElement(
                    "div"
                );

            message.id =
                "searchMessage";

            message.textContent =
                "Nenhum perfil encontrado.";

            message.style.color =
                "#9cff00";

            message.style.fontSize =
                "13px";

            message.style.padding =
                "30px 0";

            message.style.gridColumn =
                "1 / -1";

            artistsGrid.appendChild(
                message
            );

        }

    } else {

        if (
            message
        ) {

            message.remove();

        }

    }

}


/* =========================================================
   8. BOTÃO VER MAIS CATEGORIAS
   ========================================================= */

const categoryMoreButton =
    document.querySelector(
        ".category-more"
    );


if (
    categoryMoreButton &&
    categoryList
) {

    categoryMoreButton.addEventListener(
        "click",
        () => {

            const categories =
                [

                    {
                        image:
                            "/front-end/intro/img/logo.png",

                        name:
                            "DJS"

                    },

                    {
                        image:
                            "/front-end/intro/img/logo.png",

                        name:
                            "DIRETORES"

                    },

                    {
                        image:
                            "/front-end/intro/img/logo.png",

                        name:
                            "ESCRITORES"

                    }

                ];


            categories.forEach(
                (category) => {

                    const article =
                        document.createElement(
                            "article"
                        );


                    article.className =
                        "category-item";


                    article.innerHTML = `

                        <div class="category-image">

                            <img
                                src="${category.image}"
                                alt="${category.name}"
                            >

                        </div>

                        <span>
                            ${category.name}
                        </span>

                    `;


                    categoryList.insertBefore(
                        article,
                        categoryMoreButton
                    );

                }
            );


            categoryMoreButton.style.display =
                "none";

        }
    );

}


/* =========================================================
   9. NEWSLETTER
   ========================================================= */

if (
    newsletterForm
) {

    newsletterForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const emailInput =
                document.getElementById(
                    "newsletterEmail"
                );


            const email =
                emailInput.value.trim();


            if (
                !email
            ) {

                return;

            }


            if (
                !isValidEmail(
                    email
                )
            ) {

                showNotification(
                    "Digite um e-mail válido."
                );

                return;

            }


            
            showNotification(
                "E-mail cadastrado com sucesso!"
            );


            emailInput.value =
                "";

        }
    );

}


/* =========================================================
   10. VALIDAÇÃO DE E-MAIL
   ========================================================= */

function isValidEmail(
    email
) {

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    return emailRegex.test(
        email
    );

}


/* =========================================================
   11. SISTEMA DE NOTIFICAÇÃO
   ========================================================= */

function showNotification(
    message
) {

    const oldNotification =
        document.querySelector(
            ".site-notification"
        );


    if (
        oldNotification
    ) {

        oldNotification.remove();

    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "site-notification";


    notification.textContent =
        message;


    notification.style.position =
        "fixed";


    notification.style.bottom =
        "25px";


    notification.style.right =
        "25px";


    notification.style.zIndex =
        "9999";


    notification.style.padding =
        "15px 22px";


    notification.style.background =
        "#9cff00";


    notification.style.color =
        "#050505";


    notification.style.borderRadius =
        "6px";


    notification.style.fontSize =
        "12px";


    notification.style.fontWeight =
        "700";


    notification.style.boxShadow =
        "0 10px 30px rgba(0,0,0,.4)";


    document.body.appendChild(
        notification
    );


    setTimeout(
        () => {

            notification.style.opacity =
                "0";


            notification.style.transform =
                "translateY(10px)";


            notification.style.transition =
                "0.3s ease";


            setTimeout(
                () => {

                    notification.remove();

                },
                300
            );

        },
        3000
    );

}


/* =========================================================
   12. ANIMAÇÃO DOS ELEMENTOS AO ENTRAR NA TELA
   ========================================================= */

const animatedElements =
    document.querySelectorAll(
        ".artist-card, .category-card, .feature"
    );

function observeRevealElement(element) {
    if (!element || typeof observer === "undefined") {
        return;
    }

    observer.observe(element);

    if (element.getBoundingClientRect().top < window.innerHeight) {
        element.classList.add("visible");
    }
}

const observer =
    new IntersectionObserver(
        (
            entries,
            observer
        ) => {

            entries.forEach(
                (entry) => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "visible"
                        );


                        observer.unobserve(
                            entry.target
                        );

                    }

                }
            );

        },
        {

            threshold:
                0.15

        }
    );


animatedElements.forEach(
    (element) => {

        observeRevealElement(element);

    }
);


/* =========================================================
   13. CLIQUE NOS CARDS DE ARTISTAS
   ========================================================= */

const artistCards =
    document.querySelectorAll(
        ".artist-card"
    );


artistCards.forEach(
    (card) => {

        card.addEventListener(
            "click",
            () => {

                const artistName =
                    card
                        .querySelector(
                            "h3"
                        )
                        ?.textContent ||
                    "Artista";


                showNotification(
                    `Perfil de ${artistName} em breve.`
                );

            }
        );

    }
);


/* =========================================================
   14. BOTÕES DE CATEGORIA
   ========================================================= */

const categoryCards =
    document.querySelectorAll(
        ".category-card"
    );


categoryCards.forEach(
    (card) => {

        card.addEventListener(
            "click",
            () => {

                const categoryName =
                    card
                        .querySelector(
                            "span:nth-child(2)"
                        )
                        ?.textContent ||
                    "Categoria";


                showNotification(
                    `Buscando perfis de ${categoryName}.`
                );

            }
        );

    }
);


/* =========================================================
   15. BOTÕES DO HERO
   ========================================================= */

const heroButtons =
    document.querySelectorAll(
        ".hero-buttons .btn"
    );


if (
    heroButtons.length >= 2
) {


    /* EXPLORAR */

    heroButtons[0]
        .addEventListener(
            "click",
            () => {

                const artistsSection =
                    document.getElementById(
                        "artistas"
                    );


                if (
                    artistsSection
                ) {

                    artistsSection.scrollIntoView({
                        behavior:
                            "smooth"
                    });

                }

            }
        );


    /* CRIAR PERFIL */

    heroButtons[1]
        .addEventListener(
            "click",
            () => {

                showNotification(
                    "A criação de perfil estará disponível em breve."
                );

            }
        );

}


/* =========================================================
   16. BOTÕES DO HEADER
   ========================================================= */

/* =========================================================
   17. EFEITO DE APARECIMENTO DOS ELEMENTOS
   ========================================================= */

const revealStyle =
    document.createElement(
        "style"
    );


revealStyle.textContent = `

    .artist-card,
    .category-card,
    .feature {

        opacity: 0;

        transform:
            translateY(20px);

        transition:
            opacity 0.6s ease,
            transform 0.6s ease;

    }


    .artist-card.visible,
    .category-card.visible,
    .feature.visible {

        opacity: 1;

        transform:
            translateY(0);

    }


    @media (
        max-width: 768px
    ) {

        .main-nav.mobile-active {

            display: flex;

            position: fixed;

            top: 75px;

            left: 0;

            width: 100%;

            padding: 25px 20px;

            flex-direction: column;

            align-items: flex-start;

            gap: 20px;

            background:
                rgba(
                    5,
                    5,
                    5,
                    0.98
                );

            border-bottom:
                1px solid
                rgba(
                    156,
                    255,
                    0,
                    0.3
                );

        }


        .main-nav.mobile-active
        .nav-link::after {

            display: none;

        }


        .mobile-menu-button.active
        span:nth-child(1) {

            transform:
                translateY(7px)
                rotate(45deg);

        }


        .mobile-menu-button.active
        span:nth-child(2) {

            opacity: 0;

        }


        .mobile-menu-button.active
        span:nth-child(3) {

            transform:
                translateY(-7px)
                rotate(-45deg);

        }

    }

`;


document.head.appendChild(
    revealStyle
);


/* =========================================================
   18. LOG
   ========================================================= */

console.log(
    "FORA DO SITE — Plataforma carregada com sucesso."
);