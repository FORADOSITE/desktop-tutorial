document.addEventListener('DOMContentLoaded', () => {
    const backToTop = document.getElementById('backToTop');
    const currentYear = document.getElementById('currentYear');

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    if (!backToTop) {
        return;
    }

    const updateBackToTopVisibility = () => {
        backToTop.classList.toggle('visible', window.scrollY > 400);
    };

    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    updateBackToTopVisibility();

    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
