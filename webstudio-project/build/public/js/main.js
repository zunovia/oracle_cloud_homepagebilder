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

// 開閉状態は aria-expanded / ラベル / 背面スクロールロックまでまとめて反映する
function setMenu(open) {
    hamburger.classList.toggle('active', open);
    navLinks.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
}

function toggleMenu() {
    setMenu(!navLinks.classList.contains('open'));
}

function closeMenu() {
    setMenu(false);
}

if (hamburger) {
    hamburger.addEventListener('click', toggleMenu);
}

// Escapeで閉じる（開いている時だけフォーカスをボタンへ戻す）
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks && navLinks.classList.contains('open')) {
        closeMenu();
        hamburger.focus();
    }
});

// スクロール出現アニメーションは effects.js (GSAP ScrollTrigger) に移行した

// Smooth scroll for anchor links
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'start'
            });
        }
        closeMenu();
    });
});

// YouTube: クリックされて初めて iframe を差し込む（ファサード方式）
// 初期表示ではYouTubeへ一切通信せず、クッキーも発生しない。
const ytFacade = document.getElementById('ytFacade');
if (ytFacade) {
    ytFacade.addEventListener('click', () => {
        const playlist = ytFacade.dataset.playlist;
        if (!playlist) return;

        const iframe = document.createElement('iframe');
        const params = new URLSearchParams({
            list: playlist,
            autoplay: '1',
            rel: '0'
        });
        iframe.src = `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
        iframe.title = 'YouTubeチャンネル「サーコミュ」の最新動画';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;

        ytFacade.replaceWith(iframe);
        iframe.focus();
    });
}

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
