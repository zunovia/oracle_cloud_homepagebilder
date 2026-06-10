// =============================================
// 3Dシーン: 「4M×AIコア」
// Man・Machine・Material・Method の4ブロックの「すき間」に、
// 光るAIコアがスクロール連動で挿入される。
// 責務分離: GSAP側(effects.js)は state のみを書き換え、
//           Three.jsオブジェクトの更新はこのファイルのrender内に集約する。
// =============================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    particleSwirl: 0, // 粒子の中心への吸い寄せ
    idleScale: 1      // 自動回転の効き(1=ヒーロー)。ストーリーでは0にして構図を確定させる
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

// 溶岩/太陽表面風のノイズ（コアのemissiveMapに使い、のっぺりした発光を避ける）
function makeNoiseTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#7a2c08';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 240; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 6 + Math.random() * 30;
        const hot = Math.random() > 0.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hot
            ? 'rgba(255, 180, 90, ' + (0.25 + Math.random() * 0.35) + ')'
            : 'rgba(110, 25, 4, ' + (0.25 + Math.random() * 0.3) + ')');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
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

    // 環境マップ（スタジオ風IBL）。黒曜石の艶・反射の主光源になる
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // --- 4Mブロック（田の字2x2配置・中央に十字のすき間） ---
    // 黒曜石(火山ガラス)質感: ほぼ黒＋クリアコートの鋭い艶、誘電体なのでmetalness 0
    const root = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const boxMat = new THREE.MeshPhysicalMaterial({
        color: 0x06060c,
        metalness: 0.0,
        roughness: 0.16,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity: 0.65 // 黒を深く保ちつつクリアコートの鋭いハイライトだけ残す
    });
    const blocks = [];
    const labelMats = [];
    const edgeMats = [];
    LABELS.forEach((label, i) => {
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x5599ee, transparent: true, opacity: 0.3 });
        edgeMats.push(edgeMat);
        mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));
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

    // --- AIコア（リアル志向: 溶岩ノイズの発光面 + フレネル縁光 + 加算グロー + PointLight） ---
    const core = new THREE.Group();
    const noiseTex = makeNoiseTexture();
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x2a0d04,
        emissive: 0xffa050,
        emissiveMap: noiseTex,     // のっぺりを避ける表面の熱ムラ
        emissiveIntensity: 0,
        roughness: 0.45,
        metalness: 0.0
    });
    const coreGeo = new THREE.SphereGeometry(0.42, 48, 32);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);

    // 縁が熱く光るフレネルシェル（プラズマの輪郭表現）
    const rimShellGeo = new THREE.SphereGeometry(0.455, 32, 24);
    const rimShellMat = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            uColor: { value: new THREE.Color(0xff7b40) },
            uGlow: { value: 0 }
        },
        vertexShader: [
            'varying float vF;',
            'void main() {',
            '    vec3 n = normalize(normalMatrix * normal);',
            '    vec4 mv = modelViewMatrix * vec4(position, 1.0);',
            '    vec3 v = normalize(-mv.xyz);',
            '    vF = pow(1.0 - abs(dot(n, v)), 2.6);',
            '    gl_Position = projectionMatrix * mv;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 uColor;',
            'uniform float uGlow;',
            'varying float vF;',
            'void main() {',
            '    gl_FragColor = vec4(uColor, vF * uGlow);',
            '}'
        ].join('\n')
    });
    const rimShell = new THREE.Mesh(rimShellGeo, rimShellMat);

    const glowMat = new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xff7b40,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(2.6);
    const coreLight = new THREE.PointLight(0xff7b40, 0, 7);
    core.add(coreMesh, rimShell, glow, coreLight);
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

    // --- ライティング（環境マップが主光源。直接光は輪郭の補助） ---
    scene.add(new THREE.AmbientLight(0x334466, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
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
        idle.y += dt * 0.12 * idle.amp * state.idleScale;
        if (state.idleScale < 0.99) {
            // ストーリー区間では蓄積した自動回転を最短経路でほどき、各ステップの構図を確定させる
            idle.y = idle.y % (Math.PI * 2);
            if (idle.y > Math.PI) idle.y -= Math.PI * 2;
            else if (idle.y < -Math.PI) idle.y += Math.PI * 2;
            idle.y += -idle.y * Math.min(1, dt * 2.5) * (1 - state.idleScale);
        }

        // 4Mブロック配置（すき間 = state.gap）
        const o = BLOCK / 2 + 0.07 + state.gap;
        blocks.forEach((b, i) => {
            b.position.set(CORNERS[i][0] * o, CORNERS[i][1] * o, 0);
        });
        labelMats.forEach((m) => { m.opacity = state.labelO; });

        // AIコア（挿入・発光・脈動・表面の熱ムラが回って生きて見える）
        const ct = state.coreT;
        core.visible = ct > 0.001;
        if (core.visible) {
            core.position.lerpVectors(CORE_FROM, CORE_TO, ct);
            const pulse = 1 + Math.sin(elapsed * 2.4) * 0.04 * state.coreGlow;
            core.scale.setScalar(Math.max(ct, 0.001) * pulse);
            coreMesh.rotation.y += dt * 0.35;
            coreMesh.rotation.x += dt * 0.12;
            const flicker = 1 + Math.sin(elapsed * 5.3) * 0.06 + Math.sin(elapsed * 9.1) * 0.03;
            coreMat.emissiveIntensity = state.coreGlow * 3.1 * flicker;
            rimShellMat.uniforms.uGlow.value = Math.min(state.coreGlow, 1) * 0.9;
            glowMat.opacity = Math.min(state.coreGlow, 1) * 0.6;
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
        coreGeo.dispose();
        rimShellGeo.dispose();
        pGeo.dispose();
        boxMat.dispose();
        coreMat.dispose();
        rimShellMat.dispose();
        noiseTex.dispose();
        envTex.dispose();
        edgeMats.forEach((m) => m.dispose());
        if (glowMat.map) glowMat.map.dispose();
        glowMat.dispose();
        labelMats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
        });
        particles.material.dispose();
        renderer.dispose();
    }

    render(0, 16.7); // start前に1フレーム描いておく（初期表示のチラつき防止）

    return { state, start, stop, dispose };
}
