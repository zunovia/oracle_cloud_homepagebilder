// =============================================
// Apps セクションの YouTube 埋め込み（ファサード方式）
// - クリックされるまで iframe を作らないので、初期表示では YouTube へ
//   一切通信せず、クッキーも発生しない。
// - 対象は [data-yt-playlist] を持つ要素。ボタンを丸ごと iframe に置き換える。
// - トップページ側(js/main.js)と同じ方式だが、apps 配下は main.js を
//   読み込まない（3D・GSAPを持ち込まないため）ので独立して持つ。
// =============================================
document.querySelectorAll('[data-yt-playlist]').forEach((facade) => {
    facade.addEventListener('click', () => {
        const playlist = facade.dataset.ytPlaylist;
        if (!playlist) return;

        const iframe = document.createElement('iframe');
        const params = new URLSearchParams({
            list: playlist,
            autoplay: '1',
            rel: '0'
        });
        iframe.src = `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
        iframe.title = facade.dataset.ytTitle || 'YouTube 再生リスト';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;

        facade.replaceWith(iframe);
        iframe.focus();
    });
});
