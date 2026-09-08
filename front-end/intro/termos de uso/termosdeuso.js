document.addEventListener('DOMContentLoaded', () => {
    const backToTop = document.getElementById('backToTop');
    const currentYear = document.getElementById('currentYear');
    const menuLinks = [...document.querySelectorAll('.privacy-menu a[href^="#"]')];
    const sections = menuLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    const updateBackToTopVisibility = () => {
        if (backToTop) {
            backToTop.classList.toggle('visible', window.scrollY > 400);
        }
    };

    const updateActiveMenuLink = () => {
        const currentSection = sections.reduce((activeSection, section) => {
            if (section.getBoundingClientRect().top <= 140) {
                return section;
            }
            return activeSection;
        }, sections[0]);

        menuLinks.forEach((link) => {
            link.classList.toggle(
                'active',
                currentSection && link.getAttribute('href') === `#${currentSection.id}`
            );
        });
    };

    window.addEventListener('scroll', () => {
        updateBackToTopVisibility();
        updateActiveMenuLink();
    }, { passive: true });

    updateBackToTopVisibility();
    updateActiveMenuLink();

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});
