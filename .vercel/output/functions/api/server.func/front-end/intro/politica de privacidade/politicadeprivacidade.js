/* =========================================================
   FORA DO SITE
   TERMOS / POLÍTICA DE PRIVACIDADE
   JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ANO AUTOMÁTICO DO RODAPÉ
       ===================================================== */

    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    /* =====================================================
       BOTÃO VOLTAR AO TOPO
       ===================================================== */

    const backToTop = document.getElementById("backToTop");

    if (backToTop) {

        const toggleBackToTop = () => {

            if (window.scrollY > 500) {

                backToTop.classList.add("visible");

            } else {

                backToTop.classList.remove("visible");

            }

        };


        window.addEventListener(
            "scroll",
            toggleBackToTop,
            { passive: true }
        );


        backToTop.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    }


    /* =====================================================
       MENU DE NAVEGAÇÃO DA POLÍTICA
       ===================================================== */

    const menuLinks = document.querySelectorAll(
        '.privacy-menu a[href^="#"]'
    );


    const sections = [];


    menuLinks.forEach(link => {

        const targetId =
            link.getAttribute("href");

        const target =
            document.querySelector(targetId);


        if (!target) {
            return;
        }


        sections.push({
            link: link,
            section: target,
            id: targetId
        });


        link.addEventListener("click", event => {

            event.preventDefault();


            const header =
                document.querySelector(".privacy-header");


            const headerHeight =
                header
                    ? header.offsetHeight
                    : 0;


            const sectionPosition =
                target.getBoundingClientRect().top
                + window.scrollY
                - headerHeight
                - 25;


            window.scrollTo({

                top: sectionPosition,

                behavior: "smooth"

            });


            /*
             * Atualiza o endereço da página
             * sem recarregar o site.
             */

            if (
                window.history &&
                window.history.pushState
            ) {

                window.history.pushState(
                    null,
                    "",
                    targetId
                );

            }


            setActiveLink(link);

        });

    });


    /* =====================================================
       DESTACA O LINK ATIVO
       ===================================================== */

    function setActiveLink(activeLink) {

        menuLinks.forEach(link => {

            link.classList.remove("active");

        });


        if (activeLink) {

            activeLink.classList.add("active");

        }

    }


    /* =====================================================
       OBSERVA QUAL SEÇÃO ESTÁ VISÍVEL
       ===================================================== */

    if (
        sections.length > 0 &&
        "IntersectionObserver" in window
    ) {

        const observer =
            new IntersectionObserver(
                entries => {

                    const visibleSections =
                        entries
                            .filter(entry => entry.isIntersecting)
                            .sort(
                                (a, b) =>
                                    b.intersectionRatio
                                    - a.intersectionRatio
                            );


                    if (
                        visibleSections.length === 0
                    ) {

                        return;

                    }


                    const currentSection =
                        visibleSections[0].target;


                    const currentItem =
                        sections.find(
                            item =>
                                item.section
                                === currentSection
                        );


                    if (currentItem) {

                        setActiveLink(
                            currentItem.link
                        );

                    }

                },
                {
                    root: null,

                    rootMargin:
                        "-120px 0px -55% 0px",

                    threshold: [
                        0,
                        0.1,
                        0.25,
                        0.5
                    ]
                }
            );


        sections.forEach(item => {

            observer.observe(
                item.section
            );

        });

    }


    /* =====================================================
       RECUPERA A SEÇÃO PRESENTE NA URL
       ===================================================== */

    function openSectionFromUrl() {

        const hash =
            window.location.hash;


        if (!hash) {

            if (sections.length > 0) {

                setActiveLink(
                    sections[0].link
                );

            }

            return;

        }


        const currentItem =
            sections.find(
                item =>
                    item.id === hash
            );


        if (!currentItem) {

            return;

        }


        /*
         * Pequeno atraso para garantir que
         * a página já tenha sido renderizada.
         */

        setTimeout(() => {

            const header =
                document.querySelector(
                    ".privacy-header"
                );


            const headerHeight =
                header
                    ? header.offsetHeight
                    : 0;


            const sectionPosition =
                currentItem.section
                    .getBoundingClientRect()
                    .top
                + window.scrollY
                - headerHeight
                - 25;


            window.scrollTo({

                top:
                    sectionPosition,

                behavior:
                    "smooth"

            });


            setActiveLink(
                currentItem.link
            );

        }, 100);

    }


    openSectionFromUrl();


    /* =====================================================
       BOTÕES VOLTAR / AVANÇAR DO NAVEGADOR
       ===================================================== */

    window.addEventListener(
        "popstate",
        () => {

            openSectionFromUrl();

        }
    );


    /* =====================================================
       ACESSIBILIDADE
       ===================================================== */

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    if (
        prefersReducedMotion.matches
    ) {

        /*
         * Para usuários que preferem
         * menos movimento, a rolagem
         * será instantânea.
         */

        document.documentElement.style
            .scrollBehavior = "auto";

    }


    /* =====================================================
       EFEITO DE ENTRADA DOS BLOCOS
       ===================================================== */

    const contentSections =
        document.querySelectorAll(
            ".privacy-content section"
        );


    if (
        !prefersReducedMotion.matches &&
        "IntersectionObserver" in window
    ) {

        const revealObserver =
            new IntersectionObserver(
                entries => {

                    entries.forEach(entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList
                                .add("section-visible");


                            revealObserver.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.08
                }
            );


        contentSections.forEach(section => {

            section.classList.add(
                "section-hidden"
            );


            revealObserver.observe(
                section
            );

        });

    }

});