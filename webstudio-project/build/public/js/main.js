// リロード時のスクロール位置復元を無効にする。
// ストーリー区間はスクロール量に連動した演出のため、途中の位置で復元されると
// 暗転中や白い転換の最中から表示が始まり、「ページが真っ白＝壊れている」ように見える。
// 常に先頭から見せることでこれを防ぐ。
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

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
const ytFrame = document.getElementById('ytFrame');
const mediaTabs = document.getElementById('mediaTabs');

function ytEmbedUrl(playlist) {
    const params = new URLSearchParams({ list: playlist, autoplay: '1', rel: '0' });
    return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
}

if (ytFrame) {
    // 現在選択中の再生リスト。チップで切り替わる。
    let current = {
        playlist: ytFrame.querySelector('.yt-facade')?.dataset.playlist || '',
        label: '今日のAIニュース'
    };

    const play = () => {
        if (!current.playlist) return;
        const iframe = document.createElement('iframe');
        iframe.src = ytEmbedUrl(current.playlist);
        iframe.title = `再生リスト「${current.label}」`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        ytFrame.replaceChildren(iframe);
        iframe.focus();
    };

    ytFrame.addEventListener('click', (e) => {
        if (e.target.closest('.yt-facade')) play();
    });

    if (mediaTabs) {
        mediaTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.media-tab');
            if (!tab) return;

            mediaTabs.querySelectorAll('.media-tab').forEach((t) => {
                const on = t === tab;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-pressed', String(on));
            });

            current = { playlist: tab.dataset.playlist, label: tab.dataset.label };

            const playing = ytFrame.querySelector('iframe');
            if (playing) {
                // 再生中なら即座に差し替える
                play();
            } else {
                // まだ再生していなければ、ファサードの表示だけ更新して通信は起こさない
                const facade = ytFrame.querySelector('.yt-facade');
                if (facade) {
                    facade.dataset.playlist = current.playlist;
                    facade.setAttribute('aria-label', `再生リスト「${current.label}」を再生する`);
                    const label = facade.querySelector('.yt-facade-label');
                    if (label) label.textContent = current.label;
                }
            }
        });
    }
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
