document.addEventListener('DOMContentLoaded', () => {

    // Three.js effects
    new ParticleNetwork('heroCanvas', {
        particleCount: 70,
        maxDistance: 130,
        speed: 0.25
    });

    new FloatingGeometry('servicesCanvas');

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    const onScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        const spans = navToggle.querySelectorAll('span');
        if (navMenu.classList.contains('open')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        });
    });

    // Scroll animations
    const observer = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        }),
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));

    // Counter animation
    const counterObserver = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                animateCounters();
                counterObserver.unobserve(e.target);
            }
        }),
        { threshold: 0.5 }
    );

    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) counterObserver.observe(statsSection);

    function animateCounters() {
        document.querySelectorAll('.stat-number').forEach(el => {
            const target = parseInt(el.dataset.target);
            const duration = 2000;
            const start = performance.now();

            function update(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.floor(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const wasOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
            if (!wasOpen) item.classList.add('open');
        });
    });

    // Guide download modal
    const guideModal = document.getElementById('guideModal');
    const guideModalClose = document.getElementById('guideModalClose');
    const guideForm = document.getElementById('guideForm');
    const guideUrlInput = document.getElementById('guideUrl');

    document.querySelectorAll('.guide-download-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            guideUrlInput.value = btn.dataset.guide;
            guideModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeGuideModal() {
        guideModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    guideModalClose.addEventListener('click', closeGuideModal);
    guideModal.addEventListener('click', e => {
        if (e.target === guideModal) closeGuideModal();
    });

    guideForm.addEventListener('submit', e => {
        e.preventDefault();
        const url = guideUrlInput.value;
        const btn = guideForm.querySelector('button[type="submit"]');
        btn.textContent = 'Download in corso...';
        btn.style.background = '#2ecc71';

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();

        setTimeout(() => {
            btn.textContent = 'Scarica Ora';
            btn.style.background = '';
            guideForm.reset();
            closeGuideModal();
        }, 2000);
    });

    // Contact form
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Messaggio Inviato!';
            btn.style.background = '#2ecc71';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                form.reset();
            }, 3000);
        });
    }
});
