// =============================================
// ヒーローの実演パネル
// - 演出のタイミングは全部 style.css 側（.hero-demo 以下）にある。
//   このファイルは「どのパネルを表示するか」と「いつ再生するか」だけを持つ。
// - 画面外・別タブでは止める（無駄に動かさない）。
// - 動きを控える設定のときは自動送りをせず、1枚目を完成状態で置く
//   （CSSの .hero-demo:not(.is-playing) 側が完成状態を描く）。
// =============================================
(() => {
    const root = document.getElementById('heroDemo');
    if (!root) return;

    const tabs = Array.from(root.querySelectorAll('.hd-tab'));
    const panels = Array.from(root.querySelectorAll('.hd-panel'));
    if (tabs.length === 0 || tabs.length !== panels.length) return;

    const SCENE_MS = 7000;      // 1シーンの表示時間（CSS側の最終ディレイ4.0s＋読む余韻）
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    let index = 0;
    let timer = null;
    let visible = true;

    function show(i, restart) {
        index = (i + panels.length) % panels.length;
        panels.forEach((p, n) => {
            const on = n === index;
            p.hidden = !on;
            p.classList.toggle('is-active', on);
        });
        tabs.forEach((t, n) => t.setAttribute('aria-selected', String(n === index)));

        if (restart) {
            // クラスを付け直してCSSアニメーションを頭から流す
            root.classList.remove('is-playing');
            void root.offsetWidth;          // 再描画を強制（これが無いと再生されない）
            root.classList.add('is-playing');
        }
    }

    function play() {
        stop();
        if (reduce.matches || !visible) return;
        root.classList.add('is-playing');
        timer = setInterval(() => show(index + 1, true), SCENE_MS);
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    // 手動で選んだら、その場から自動送りを再開する
    tabs.forEach((tab, n) => {
        tab.addEventListener('click', () => {
            show(n, !reduce.matches);
            if (!reduce.matches && visible) play();
        });
        tab.addEventListener('keydown', (e) => {
            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const next = (n + step + tabs.length) % tabs.length;
            tabs[next].focus();
            tabs[next].click();
        });
    });

    // 画面外では止める
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            if (visible) { play(); } else { stop(); }
        }, { threshold: 0.15 }).observe(root);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { stop(); } else if (visible) { play(); }
    });

    reduce.addEventListener('change', () => {
        if (reduce.matches) {
            stop();
            root.classList.remove('is-playing');
        } else {
            play();
        }
    });

    show(0, false);
    if (!reduce.matches) play();
})();
