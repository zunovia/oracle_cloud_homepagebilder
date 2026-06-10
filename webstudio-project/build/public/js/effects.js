// =============================================
// スクロール連動演出の統括（GSAP + ScrollTrigger）
// - 初期非表示スタイルは effects.css の html.fx-on スコープ配下にのみ存在する。
//   GSAP/Three.js が読めない環境・reduced-motion では fx-on が付かず、
//   素のサイトとして全コンテンツが表示される（自動フォールバック）。
// - 3Dは scene.js の state を書き換えるだけ。Three.jsオブジェクトには触れない。
// =============================================

const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (window.gsap && window.ScrollTrigger && motionOK) {
    document.documentElement.classList.add('fx-on');
    window.gsap.registerPlugin(window.ScrollTrigger);
    boot();
}

async function boot() {
    // --- 3Dシーン初期化（three.jsのCDN障害・WebGL非対応でもマスク演出は継続） ---
    const fallbackState = {
        gap: 0.05, coreT: 0, coreGlow: 0, labelO: 0, rotY: -0.35, rotX: 0.1,
        camZ: 6, camOff: 0, posX: 1.25, posY: 0, rim: 0.6, particleSwirl: 0,
        idleScale: 1
    };
    const canvas = document.getElementById('bg3d');
    let scene = null;
    let state = fallbackState;
    try {
        const mod = await import('./scene.js');
        scene = canvas ? mod.initScene(canvas) : null;
        if (scene) state = mod.state;
    } catch (e) {
        scene = null;
    }
    if (!scene) {
        document.documentElement.classList.add('no-webgl');
        if (canvas) canvas.remove();
    } else {
        scene.start();
        setupDragHint();
    }

    setupHeroAndStory(scene, state, canvas);
    setupReveals();
    setupLifecycle(scene, canvas);

    // Webフォント読み込み完了で行高が変わるためレイアウト再計算
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => window.ScrollTrigger.refresh());
    }
}

// 初回操作で「ドラッグで回転」ヒントを消す
function setupDragHint() {
    const hint = document.querySelector('.drag-hint');
    const hero = document.getElementById('home');
    if (!hint || !hero) return;
    hero.addEventListener('pointerdown', () => {
        window.gsap.to(hint, { autoAlpha: 0, duration: 0.4 });
    }, { once: true });
}

// =============================================
// ヒーロー退場 + ストーリー（ピン留めスクロール演出）
// ブレークポイント別に gsap.matchMedia で構築（切替時は自動revert）
// =============================================
function setupHeroAndStory(scene, state, canvas) {
    const gsap = window.gsap;
    const heroContent = document.querySelector('.hero-content');
    const story = document.querySelector('.story');

    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 769px)', mobile: '(max-width: 768px)' }, (ctx) => {
        const mobile = ctx.conditions.mobile;

        // ブレークポイント別の3D初期配置（ヒーロー: デスクトップ右寄せ／モバイル上寄せ）
        const HERO = {
            posX: mobile ? 0 : 1.25,
            posY: mobile ? 0.95 : 0,
            camZ: mobile ? 7.4 : 6,
            rotY: -0.35
        };
        const STORY_IN = { posX: 0, posY: mobile ? 0.55 : 0, camZ: mobile ? 6.6 : 5.2, rotY: 0.4 };
        gsap.set(state, { ...HERO, camOff: 0, idleScale: 1 });

        // --- ストーリー: 1本のマスタータイムラインに3D・コピー・マスクを全て載せる ---
        // （ヒーロー退場より先に構築する。後から作るヒーロー側の初期描画を最終状態にするため）
        if (story) {
            const lines = Array.from(story.querySelectorAll('.story-line > span'));
            const stat = story.querySelector('.story-stat');
            const num = story.querySelector('.stat-number');
            const fill = story.querySelector('.stat-bar-fill');
            const trans = story.querySelector('.story-transition');
            const counter = { v: 0 };
            if (num) num.textContent = '0.0'; // HTMLは87.5（JS無効時にも正しい値が見えるように）

            gsap.set(lines, { clipPath: 'inset(0% 100% 0% 0%)', yPercent: 60, autoAlpha: 0 });
            if (stat) gsap.set(stat, { autoAlpha: 0, y: 50 });

            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: story,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 1
                }
            });
            const lineIn = (el, pos) => tl.fromTo(el,
                { clipPath: 'inset(0% 100% 0% 0%)', yPercent: 60, autoAlpha: 0 },
                {
                    clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, autoAlpha: 1,
                    duration: 0.55, ease: 'power3.out', immediateRender: false
                }, pos);
            const lineOut = (el, pos) => tl.to(el,
                {
                    clipPath: 'inset(0% 0% 0% 100%)', yPercent: -50, autoAlpha: 0,
                    duration: 0.45, ease: 'power2.in'
                }, pos);

            // Step1: 「現場の4Mは、そのまま。」(0–2.5)
            tl.to(state, { labelO: 0.85, duration: 0.8 }, 0);
            tl.fromTo(state, { rotY: STORY_IN.rotY },
                { rotY: 0.62, duration: 2.5, immediateRender: false }, 0); // 正面寄りを保ちラベルと十字すき間を読ませる
            if (lines[0]) { lineIn(lines[0], 0.2); lineOut(lines[0], 2.0); }

            // Step2: 「変えるのは、すき間だけ。」— すき間が開く (2.5–5.0)
            tl.to(state, { gap: 0.95, duration: 2.0, ease: 'power2.inOut' }, 2.5);
            tl.to(state, { camOff: 1.2, duration: 2.0 }, 2.5); // ブロックが画角から見切れないようカメラを引く
            tl.to(state, { rim: 1.1, duration: 2.0 }, 2.5);
            if (lines[1]) { lineIn(lines[1], 2.7); lineOut(lines[1], 4.6); }

            // Step3: 「すき間に、AIを挟む。」— コア挿入＋発光 (5.0–7.5)
            tl.to(state, { coreT: 1, duration: 1.5, ease: 'back.out(1.4)' }, 5.0);
            tl.to(state, { coreGlow: 1, duration: 1.5, ease: 'power1.in' }, 5.4);
            tl.to(state, { particleSwirl: 1, duration: 2.0 }, 5.4);
            tl.to(state, { gap: 0.55, duration: 1.2, ease: 'power2.inOut' }, 6.0); // ブロックがコアを抱く
            if (lines[2]) { lineIn(lines[2], 5.2); lineOut(lines[2], 7.2); }

            // Step4: 87.5%カウントアップ (7.5–9.3)
            if (stat) {
                tl.fromTo(stat, { autoAlpha: 0, y: 50 },
                    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', immediateRender: false }, 7.5);
                if (num) {
                    tl.to(counter, {
                        v: 87.5, duration: 1.3,
                        onUpdate: () => { num.textContent = counter.v.toFixed(1); }
                    }, 7.6);
                }
                if (fill) {
                    tl.fromTo(fill, { scaleX: 0 },
                        { scaleX: 0.875, duration: 1.3, immediateRender: false }, 7.6);
                }
            }
            tl.to(state, { rotY: 1.0, duration: 1.8 }, 7.5);

            // 遷移: コアが一閃 → 白サークルが画面を満たしライトテーマへ (9.25–10)
            tl.to(state, { coreGlow: 1.6, duration: 0.35 }, 9.25);
            if (trans) {
                tl.fromTo(trans, { clipPath: 'circle(0% at 50% 52%)' },
                    {
                        clipPath: 'circle(141% at 50% 52%)',
                        duration: 0.75, ease: 'power1.in', immediateRender: false
                    }, 9.25);
            }
            if (scene && canvas) {
                tl.to(canvas, { autoAlpha: 0, duration: 0.3 }, 9.7);
            }
        }

        // --- ヒーロー退場（コピーが上方向へ拭き消え、3Dが右寄せ→中央へ） ---
        // clip-pathはCTAボタンの影を切らないよう負のinsetでブリードさせる
        if (heroContent) {
            gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 1 }
            })
                .fromTo(heroContent,
                    { yPercent: 0, autoAlpha: 1, clipPath: 'inset(-20% -20% -20% -20%)' },
                    { yPercent: -28, autoAlpha: 0, clipPath: 'inset(-20% -20% 110% -20%)' }, 0)
                .to('.scroll-indicator', { autoAlpha: 0 }, 0)
                .fromTo(state, { rotY: HERO.rotY },
                    { rotY: STORY_IN.rotY, immediateRender: true }, 0)
                .to(state, {
                    posX: STORY_IN.posX, posY: STORY_IN.posY, camZ: STORY_IN.camZ,
                    idleScale: 0 // ストーリーでは自動回転を止め、構図をスクロールで確定させる
                }, 0);
        }
    });
}

// =============================================
// 既存セクションのマスクリビール（ライト区間・全て once:true の単発）
// 完了後は clearProps で inline の clip-path / transform を除去し、
// CSS側の :hover transform や .pricing-featured の scale を復活させる。
// =============================================
function setupReveals() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const clearFx = (targets) => () => gsap.set(targets, { clearProps: 'clipPath,transform' });

    // 見出しブロック: ラベル → タイトル(ワイプ+上昇) → 下線(スケール)
    gsap.utils.toArray('.section-header').forEach((header) => {
        const label = header.querySelector('.section-label');
        const title = header.querySelector('.section-title');
        const divider = header.querySelector('.section-divider');
        gsap.set(header, { autoAlpha: 1 }); // header自体の .fade-in 透明は解除し子要素で演出
        const tl = gsap.timeline({
            scrollTrigger: { trigger: header, start: 'top 82%', once: true }
        });
        if (label) {
            tl.fromTo(label, { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', immediateRender: true }, 0);
        }
        if (title) {
            tl.fromTo(title, { autoAlpha: 0, y: 36, clipPath: 'inset(0% 0% 100% 0%)' },
                {
                    autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)',
                    duration: 0.8, ease: 'power3.out', immediateRender: true,
                    onComplete: clearFx(title)
                }, 0.1);
        }
        if (divider) {
            tl.fromTo(divider, { scaleX: 0 },
                {
                    scaleX: 1, duration: 0.6, ease: 'power2.out', immediateRender: true,
                    onComplete: clearFx(divider)
                }, 0.45);
        }
    });

    // 横ワイプ（左右）
    const wipe = (el, fromLeft) => {
        gsap.fromTo(el,
            {
                autoAlpha: 0,
                x: fromLeft ? -28 : 28,
                clipPath: fromLeft ? 'inset(-5% 100% -5% -5%)' : 'inset(-5% -5% -5% 100%)'
            },
            {
                autoAlpha: 1, x: 0, clipPath: 'inset(-5% -5% -5% -5%)',
                duration: 0.9, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 82%', once: true },
                onComplete: clearFx(el)
            });
    };
    gsap.utils.toArray('.fade-in-left').forEach((el) => wipe(el, true));
    gsap.utils.toArray('.fade-in-right').forEach((el) => wipe(el, false));

    // aboutロゴ: サークルワイプ（親の横ワイプと重ねる）
    const aboutImg = document.querySelector('.about-image');
    if (aboutImg) {
        gsap.fromTo(aboutImg,
            { clipPath: 'circle(0% at 38% 50%)' },
            {
                clipPath: 'circle(135% at 38% 50%)', duration: 1.1, ease: 'power2.out',
                scrollTrigger: { trigger: aboutImg, start: 'top 80%', once: true },
                onComplete: clearFx(aboutImg)
            });
    }

    // カード群: 部分マスク + stagger
    const gridSels = ['.activities-grid', '.services-grid', '.pricing-grid', '.profile-strength-grid'];
    const gridParents = [];
    let cards = [];
    gridSels.forEach((sel) => {
        const grid = document.querySelector(sel);
        if (!grid) return;
        gridParents.push(grid);
        cards = cards.concat(Array.from(grid.children));
    });
    if (gridParents.length) gsap.set(gridParents, { autoAlpha: 1 }); // 親の .fade-in 透明は解除し子で演出
    if (cards.length) {
        gsap.set(cards, { autoAlpha: 0, y: 40, clipPath: 'inset(-5% -5% 30% -5%)' });
        ScrollTrigger.batch(cards, {
            start: 'top 86%',
            once: true,
            onEnter: (batch) => gsap.to(batch, {
                autoAlpha: 1, y: 0, clipPath: 'inset(-5% -5% -5% -5%)',
                duration: 0.8, ease: 'power3.out', stagger: 0.12,
                onComplete: clearFx(batch)
            })
        });
    }

    // 汎用上昇（上で個別演出した要素は除外）
    const handled = new Set(cards);
    gridParents.forEach((g) => handled.add(g));
    document.querySelectorAll('.section-header').forEach((h) => handled.add(h));
    gsap.utils.toArray('.fade-in').forEach((el) => {
        if (handled.has(el)) return;
        gsap.fromTo(el, { autoAlpha: 0, y: 40 },
            {
                autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
                onComplete: clearFx(el)
            });
    });
}

// =============================================
// レンダーループのライフサイクル（ライト区間・タブ非表示でコストゼロに）
// =============================================
function setupLifecycle(scene, canvas) {
    if (!scene) return;
    const gsap = window.gsap;
    let inDarkZone = true;
    const lz = document.querySelector('.light-zone');
    if (lz) {
        window.ScrollTrigger.create({
            trigger: lz,
            start: 'top bottom',
            onEnter: () => {
                inDarkZone = false;
                scene.stop();
                if (canvas) gsap.set(canvas, { autoAlpha: 0 });
            },
            onLeaveBack: () => {
                inDarkZone = true;
                scene.start();
                // 保険: scrub未到達でcanvas非表示が残留しないよう復元
                // （この時点ではstory-transitionの白が全画面を覆っているため一瞬の復元は見えない）
                if (canvas) gsap.set(canvas, { autoAlpha: 1 });
            }
        });
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) scene.stop();
        else if (inDarkZone) scene.start();
    });
}
