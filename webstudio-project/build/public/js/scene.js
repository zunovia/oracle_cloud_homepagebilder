// =============================================
// 3Dシーン: 「4M×AIコア」
// Man・Machine・Material・Method の4ブロックの「すき間」に、
// 光るAIコアがスクロール連動で挿入される。
// 責務分離: GSAP側(effects.js)は state のみを書き換え、
//           Three.jsオブジェクトの更新はこのファイルのrender内に集約する。
// =============================================
import * as THREE from 'three';

// スクロール演出(GSAP)とレンダーループの唯一の共有点
export const state = {
    gap: 0.05,        // ブロック間のすき間
    coreT: 0,         // AIコア挿入度 0=画面外 → 1=中央に定着
    coreGlow: 0,      // 発光係数（emissive / グロー / PointLight）
    labelO: 0,        // 4MラベルSpriteの透過度
    rotY: -0.35,      // スクロール由来の基準回転（ドラッグ・自動回転は加算合成）
    rotX: 0.1,
    camZ: 6,          // カメラ基準距離
    camOff: 0,        // ストーリー用カメラ引き（差分・ブレークポイント非依存）
    posX: 1.25,       // ルート位置（デスクトップヒーローでは右寄せ）
    posY: 0,
    rim: 0.6,         // リムライト強度
    particleSwirl: 0  // 粒子の中心への吸い寄せ
};

const BLOCK = 1.1;
const LABELS = ['Man', 'Machine', 'Material', 'Method'];
const CORNERS = [[-1, 1], [1, 1], [-1, -1], [1, -1]];

function makeLabelTexture(text) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#AFCBF4';
    ctx.font = '600 42px Inter, "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 205, 160, 1)');
    g.addColorStop(0.35, 'rgba(255, 123, 64, 0.55)');
    g.addColorStop(1, 'rgba(255, 107, 53, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// WebGL初期化に失敗した場合は null を返す（呼び出し側が no-webgl フォールバック）
export function initScene(canvas) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: (window.devicePixelRatio || 1) < 1.75,
            powerPreference: 'high-performance'
        });
    } catch (e) {
        return null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);

    // --- 4Mブロック（田の字2x2配置・中央に十字のすき間） ---
    const root = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x2d2d44, roughness: 0.35, metalness: 0.55 });
    const blocks = [];
    const labelMats = [];
    LABELS.forEach((label, i) => {
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.add(new THREE.LineSegments(
            edgeGeo,
            new THREE.LineBasicMaterial({ color: 0x5599ee, transparent: true, opacity: 0.6 })
        ));
        const sMat = new THREE.SpriteMaterial({
            map: makeLabelTexture(label),
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(sMat);
        sprite.scale.set(0.95, 0.475, 1);
        sprite.position.z = BLOCK / 2 + 0.12;
        mesh.add(sprite);
        labelMats.push(sMat);
        blocks.push(mesh);
        root.add(mesh);
    });

    // --- AIコア（emissive + 加算グローSprite + PointLight でBloom代替の軽量構成） ---
    const core = new THREE.Group();
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff8c55,
        emissive: 0xff6b35,
        emissiveIntensity: 0,
        roughness: 0.25,
        metalness: 0.1,
        flatShading: true
    });
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), coreMat);
    const glowMat = new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xff7b40,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(2.8);
    const coreLight = new THREE.PointLight(0xff7b40, 0, 7);
    core.add(coreMesh, glow, coreLight);
    core.visible = false;
    root.add(core);
    scene.add(root);

    // --- 背景パーティクル ---
    const pCount = isMobile ? 150 : 400;
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        const r = 3 + Math.random() * 4.5;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
        pos[i * 3 + 2] = r * Math.cos(ph) - 1.5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.03,
        color: 0x88bbff,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    scene.add(particles);

    // --- ライティング ---
    scene.add(new THREE.AmbientLight(0x334466, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2.5, 3, 4);
    const rim = new THREE.DirectionalLight(0x3377dd, 0.6);
    rim.position.set(-3, -1, -4);
    scene.add(key, rim);

    // --- ドラッグ回転（商品ビュー） + アイドル自動回転 ---
    // canvasは pointer-events:none のままにし、ハンドラは #home / #story に付ける。
    // a/button等から始まる操作はドラッグにしない（クリック阻害ゼロ）。
    const drag = { x: 0, y: 0, tx: 0, ty: 0, active: false, moved: 0, lastEnd: -10 };
    const idle = { y: 0, amp: 1 };
    let lastPX = 0;
    let lastPY = 0;
    let elapsed = 0;

    function onDown(e) {
        if (e.target.closest('a, button, input, textarea, select')) return;
        if (e.pointerType === 'mouse') e.preventDefault(); // テキスト選択の暴発防止
        drag.active = true;
        drag.moved = 0;
        lastPX = e.clientX;
        lastPY = e.clientY;
        e.currentTarget.classList.add('is-dragging');
    }

    function onMove(e) {
        if (!drag.active) return;
        const dx = e.clientX - lastPX;
        const dy = e.clientY - lastPY;
        lastPX = e.clientX;
        lastPY = e.clientY;
        drag.moved += Math.abs(dx);
        if (drag.moved < 6) return; // クリックの誤反応防止（デッドゾーン）
        drag.ty += dx * 0.005;
        drag.tx = Math.max(-0.45, Math.min(0.45, drag.tx + dy * 0.0035));
    }

    function onUp() {
        if (!drag.active) return;
        drag.active = false;
        drag.lastEnd = elapsed;
        dragTargets.forEach((el) => el.classList.remove('is-dragging'));
    }

    const dragTargets = [];
    ['#home', '#story'].forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp); // 縦スワイプはtouch-action:pan-yがcancelしてくれる
        el.addEventListener('pointerleave', onUp);
        dragTargets.push(el);
    });

    // --- リサイズ（debounce 200ms） ---
    function applySize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    let resizeTimer = null;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applySize, 200);
    }
    window.addEventListener('resize', onResize);
    applySize();

    // --- WebGLコンテキスト喪失時は静かに退場（no-webglフォールバックへ） ---
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        stop();
        canvas.style.display = 'none';
        document.documentElement.classList.add('no-webgl');
    });

    // --- レンダーループ（gsap.ticker駆動・タブ非表示時はrAFごと停止する） ---
    const CORE_FROM = new THREE.Vector3(0.9, 2.4, 1.4);
    const CORE_TO = new THREE.Vector3(0, 0, 0);

    function render(time, deltaMS) {
        const dt = Math.min((deltaMS || 16.7) / 1000, 0.05);
        elapsed += dt;

        // ドラッグ慣性 + アイドル自動回転（操作終了3秒後にゆっくり再開）
        drag.y += (drag.ty - drag.y) * 0.08;
        drag.x += (drag.tx - drag.x) * 0.08;
        const wantIdle = !drag.active && (elapsed - drag.lastEnd > 3);
        idle.amp += ((wantIdle ? 1 : 0) - idle.amp) * 0.04;
        idle.y += dt * 0.12 * idle.amp;

        // 4Mブロック配置（すき間 = state.gap）
        const o = BLOCK / 2 + 0.07 + state.gap;
        blocks.forEach((b, i) => {
            b.position.set(CORNERS[i][0] * o, CORNERS[i][1] * o, 0);
        });
        labelMats.forEach((m) => { m.opacity = state.labelO; });

        // AIコア（挿入・発光・脈動）
        const ct = state.coreT;
        core.visible = ct > 0.001;
        if (core.visible) {
            core.position.lerpVectors(CORE_FROM, CORE_TO, ct);
            const pulse = 1 + Math.sin(elapsed * 2.4) * 0.04 * state.coreGlow;
            core.scale.setScalar(Math.max(ct, 0.001) * pulse);
            coreMesh.rotation.y += dt * 0.6;
            coreMesh.rotation.x += dt * 0.25;
            coreMat.emissiveIntensity = state.coreGlow * 2.5;
            glowMat.opacity = Math.min(state.coreGlow, 1) * 0.85;
            coreLight.intensity = state.coreGlow * 3;
        }

        // ルート姿勢 = スクロール基準値 + ドラッグ + 自動回転 の加算合成
        root.rotation.y = state.rotY + drag.y + idle.y;
        root.rotation.x = state.rotX + drag.x;
        root.position.set(state.posX, state.posY + Math.sin(elapsed * 0.8) * 0.05, 0);
        camera.position.z = state.camZ + state.camOff;
        rim.intensity = state.rim;

        // パーティクル（Step3で中心へ吸い寄せ）
        particles.rotation.y += dt * (0.02 + state.particleSwirl * 0.22);
        particles.scale.setScalar(1 - state.particleSwirl * 0.5);

        renderer.render(scene, camera);
    }

    let running = false;
    function start() {
        if (running || !window.gsap) return;
        running = true;
        window.gsap.ticker.add(render);
    }
    function stop() {
        if (!running) return;
        running = false;
        window.gsap.ticker.remove(render);
    }

    function dispose() {
        stop();
        window.removeEventListener('resize', onResize);
        dragTargets.forEach((el) => {
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
            el.removeEventListener('pointerleave', onUp);
        });
        boxGeo.dispose();
        edgeGeo.dispose();
        pGeo.dispose();
        renderer.dispose();
    }

    render(0, 16.7); // start前に1フレーム描いておく（初期表示のチラつき防止）

    return { state, start, stop, dispose };
}
