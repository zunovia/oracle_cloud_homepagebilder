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

// スクロール出現アニメーションは effects.js (GSAP ScrollTrigger) に移行した

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
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const successMsg = this.querySelector('.form-success');
        const errorMsg = this.querySelector('.form-error');
        const submitBtn = this.querySelector('button[type="submit"]');
        const inputs = this.querySelectorAll('input, textarea');

        successMsg.classList.remove('show');
        errorMsg.classList.remove('show');
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';

        const formData = {
            name: this.querySelector('[name="name"]').value,
            email: this.querySelector('[name="email"]').value,
            company: this.querySelector('[name="company"]').value,
            message: this.querySelector('[name="message"]').value
        };

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                successMsg.classList.add('show');
                inputs.forEach(input => { input.value = ''; });
                setTimeout(() => { successMsg.classList.remove('show'); }, 8000);
            } else {
                errorMsg.classList.add('show');
                setTimeout(() => { errorMsg.classList.remove('show'); }, 8000);
            }
        } catch {
            errorMsg.classList.add('show');
            setTimeout(() => { errorMsg.classList.remove('show'); }, 8000);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '送信する';
        }
    });
}

// 旧ヒーローパーティクルは3D側(scene.js)の粒子に置換し削除
