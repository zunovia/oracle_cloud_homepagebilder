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
