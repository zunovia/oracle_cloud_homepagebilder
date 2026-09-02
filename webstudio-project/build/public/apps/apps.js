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
// - ソフトウェアはカメラの「機種ごと」の費用。同じ機種を何台使っても1機種分。
//   機種数は台数を超えられないので、台数を減らしたら機種数も引き下げる。
// - JSが動かない場合は HTML の初期表示（1台・1機種・こちらで用意）がそのまま
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

    const el = {
        count: est.querySelector('#est-count'),
        types: est.querySelector('#est-types'),
        softline: est.querySelector('[data-est="softline"]'),
        soft: est.querySelector('[data-est="soft"]'),
        camline: est.querySelector('[data-est="camline"]'),
        cam: est.querySelector('[data-est="cam"]'),
        total: est.querySelector('[data-est="total"]'),
        copy: est.querySelector('[data-est="copy"]'),
    };

    const MAX = +el.count.max || 6;
    const yen = (n) => n.toLocaleString('ja-JP') + '円';
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    let last = '';

    function num(input, hi) {
        const n = Math.floor(Number(input.value));
        return Number.isFinite(n) ? clamp(n, 1, hi) : 1;
    }

    function ours() {
        return est.querySelector('input[name="est-cam"]:checked').value === 'ours';
    }

    function render() {
        const count = num(el.count, MAX);
        const types = num(el.types, count); // 機種数は台数を超えない

        if (String(count) !== el.count.value) el.count.value = count;
        if (String(types) !== el.types.value) el.types.value = types;
        el.types.max = String(count);

        const softTotal = types * P.soft;
        const camTotal = ours() ? count * P.cam : 0;
        const base = P.power + softTotal + camTotal;

        el.softline.textContent = types + '機種 × ' + yen(P.soft);
        el.soft.textContent = yen(softTotal);
        el.camline.textContent = ours()
            ? count + '台 × ' + yen(P.cam)
            : count + '台・お客様手配';
        el.cam.textContent = ours() ? yen(camTotal) : '0円';
        el.total.textContent = (P.piMin + base).toLocaleString('ja-JP') + '〜' + yen(P.piMax + base);

        est.querySelectorAll('[data-est-step]').forEach((b) => {
            const target = b.dataset.estTarget === 'types' ? el.types : el.count;
            const hi = target === el.types ? count : MAX;
            const to = (target === el.types ? types : count) + Number(b.dataset.estStep);
            b.disabled = to < 1 || to > hi;
        });

        last = [
            'SafeCam 概算見積り（1拠点・税抜）',
            '・録画機（Raspberry Pi）: ' + yen(P.piMin) + '〜' + yen(P.piMax),
            '・電源・ケーブル類: ' + yen(P.power),
            '・SafeCam ソフトウェア ' + el.softline.textContent + ': ' + el.soft.textContent,
            '・カメラ ' + el.camline.textContent + ': ' + el.cam.textContent,
            '合計: ' + el.total.textContent + '（税抜）',
            '※ ランニングは電気代のみ（月100円前後）',
        ].join('\n');
    }

    est.querySelectorAll('[data-est-step]').forEach((b) => {
        b.addEventListener('click', () => {
            const target = b.dataset.estTarget === 'types' ? el.types : el.count;
            target.value = Number(target.value) + Number(b.dataset.estStep);
            render();
        });
    });

    [el.count, el.types].forEach((input) => {
        input.addEventListener('input', render);
        input.addEventListener('blur', render);
    });

    est.querySelectorAll('input[name="est-cam"]').forEach((r) => r.addEventListener('change', render));

    if (el.copy && navigator.clipboard) {
        const label = el.copy.textContent;
        el.copy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(last);
                el.copy.textContent = 'コピーしました';
            } catch {
                el.copy.textContent = 'コピーできませんでした';
            }
            setTimeout(() => { el.copy.textContent = label; }, 2000);
        });
    } else if (el.copy) {
        el.copy.hidden = true;
    }

    render();
})();
