// =============================================
// Apps セクションの YouTube 埋め込み（ファサード方式）
// - クリックされるまで iframe を作らないので、初期表示では YouTube へ
//   一切通信せず、クッキーも発生しない。
// - 対象は2種類:
//     [data-yt-playlist] … 再生リスト（アプリ一覧の縦型Shorts）
//     [data-yt-video]    … 単体動画（各アプリの紹介動画・横型）
//   どちらもボタンを丸ごと iframe に置き換える。
// - トップページ側(js/main.js)と同じ方式だが、apps 配下は main.js を
//   読み込まない（3D・GSAPを持ち込まないため）ので独立して持つ。
// =============================================
document.querySelectorAll('[data-yt-playlist], [data-yt-video]').forEach((facade) => {
    facade.addEventListener('click', () => {
        const playlist = facade.dataset.ytPlaylist;
        const video = facade.dataset.ytVideo;
        if (!playlist && !video) return;

        const params = new URLSearchParams({ autoplay: '1', rel: '0' });
        let src;
        if (video) {
            src = `https://www.youtube-nocookie.com/embed/${video}?${params}`;
        } else {
            params.set('list', playlist);
            src = `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
        }

        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.title = facade.dataset.ytTitle || 'YouTube 動画';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;

        facade.replaceWith(iframe);
        iframe.focus();
    });
});

// =============================================
// 見積りシミュレーター（SafeCam）
// - 金額は HTML 側の data-* 属性が唯一の出所。価格改定は HTML だけ直せばよい。
// - JSが動かない場合は HTML の初期表示（カメラ1台・こちらで用意）がそのまま
//   正しい見積りになるので、何も壊れない。
// =============================================
(() => {
    const est = document.getElementById('est');
    if (!est) return;

    const P = {
        piMin: +est.dataset.piMin,
        piMax: +est.dataset.piMax,
        power: +est.dataset.power,
        soft: +est.dataset.soft,
        cam: +est.dataset.cam,
    };

    const input = est.querySelector('#est-count');
    const steps = est.querySelectorAll('[data-est-step]');
    const radios = est.querySelectorAll('input[name="est-cam"]');
    const out = {
        camline: est.querySelector('[data-est="camline"]'),
        cam: est.querySelector('[data-est="cam"]'),
        total: est.querySelector('[data-est="total"]'),
    };
    const copyBtn = est.querySelector('[data-est="copy"]');

    const MIN = +input.min || 1;
    const MAX = +input.max || 8;
    const yen = (n) => n.toLocaleString('ja-JP') + '円';

    let last = null;

    function count() {
        const n = Math.floor(Number(input.value));
        return Number.isFinite(n) ? Math.min(MAX, Math.max(MIN, n)) : MIN;
    }

    function ours() {
        return est.querySelector('input[name="est-cam"]:checked').value === 'ours';
    }

    function render() {
        const n = count();
        if (String(n) !== input.value) input.value = n;

        const camTotal = ours() ? n * P.cam : 0;
        const base = P.power + P.soft + camTotal;

        out.camline.textContent = ours() ? `${n}台 × ${yen(P.cam)}` : `${n}台・お客様手配`;
        out.cam.textContent = ours() ? yen(camTotal) : '0円';
        out.total.textContent = `${(P.piMin + base).toLocaleString('ja-JP')}〜${yen(P.piMax + base)}`;

        steps.forEach((b) => {
            const to = n + Number(b.dataset.estStep);
            b.disabled = to < MIN || to > MAX;
        });

        last = [
            'SafeCam 概算見積り（1拠点）',
            `・録画機（Raspberry Pi）: ${yen(P.piMin)}〜${yen(P.piMax)}`,
            `・電源・ケーブル類: ${yen(P.power)}`,
            `・SafeCam ソフトウェア: ${yen(P.soft)}`,
            `・カメラ ${out.camline.textContent}: ${out.cam.textContent}`,
            `合計: ${out.total.textContent}`,
            '※ ランニングは電気代のみ（月100円前後）',
        ].join('\n');
    }

    steps.forEach((b) => b.addEventListener('click', () => {
        input.value = count() + Number(b.dataset.estStep);
        render();
    }));
    input.addEventListener('input', render);
    input.addEventListener('blur', render);
    radios.forEach((r) => r.addEventListener('change', render));

    if (copyBtn && navigator.clipboard) {
        const label = copyBtn.textContent;
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(last);
                copyBtn.textContent = 'コピーしました';
            } catch {
                copyBtn.textContent = 'コピーできませんでした';
            }
            setTimeout(() => { copyBtn.textContent = label; }, 2000);
        });
    } else if (copyBtn) {
        copyBtn.hidden = true;
    }

    render();
})();
