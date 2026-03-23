// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

function toggleMenu() {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
}

function closeMenu() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');
}

// Scroll animations (Intersection Observer)
const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach((el) => {
    observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        closeMenu();
    });
});

// Contact form handling
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const successMsg = this.querySelector('.form-success');
        const inputs = this.querySelectorAll('input, textarea');

        successMsg.classList.add('show');
        inputs.forEach(input => { input.value = ''; });

        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);
    });
}

// Hero particles
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('hero-particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 8 + 6) + 's';
        particle.style.animationDelay = (Math.random() * 5) + 's';
        particle.style.width = (Math.random() * 4 + 2) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

createParticles();

// Counter animation for highlight numbers
function animateCounters() {
    const counters = document.querySelectorAll('.highlight-number');
    counters.forEach(counter => {
        const text = counter.textContent;
        const match = text.match(/^([\d.]+)/);
        if (!match) return;

        const target = parseFloat(match[1]);
        const suffix = text.slice(match[0].length);
        const isDecimal = match[1].includes('.');
        const duration = 1500;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;

            if (isDecimal) {
                counter.innerHTML = current.toFixed(1) + suffix;
            } else {
                counter.innerHTML = Math.floor(current) + suffix;
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    });
}

// Trigger counter animation when highlights become visible
const highlightObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            highlightObserver.disconnect();
        }
    });
}, { threshold: 0.3 });

const highlightsSection = document.querySelector('.highlights');
if (highlightsSection) {
    highlightObserver.observe(highlightsSection);
}
