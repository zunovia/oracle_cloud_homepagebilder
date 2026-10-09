// 「いまYouTubeでAI相談ライブ配信中」のバナー。
// 配信していない時は何も表示しない。状態は Cloudflare Worker（surc-live-status）から読む。
// 読めなかった場合も何も表示しない（サイトの表示を止めない）。
(() => {
  const ENDPOINT = "https://surc-live-status.kaneda-ryota.workers.dev/status";
  const CLOSED_KEY = "surc-live-banner-closed";
  const REFRESH_MS = 60 * 1000;

  let banner = null;

  function closedFor(videoId) {
    try {
      return sessionStorage.getItem(CLOSED_KEY) === videoId;
    } catch {
      return false;
    }
  }

  function injectStyle() {
    if (document.getElementById("surc-live-banner-style")) return;
    const style = document.createElement("style");
    style.id = "surc-live-banner-style";
    style.textContent = `
      .surc-live-banner { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 9999;
        display: flex; align-items: center; gap: 12px; max-width: calc(100% - 32px); box-sizing: border-box;
        background: #ffffff; color: #1f2430; border-radius: 999px; padding: 10px 12px 10px 18px;
        box-shadow: 0 8px 28px rgba(20, 40, 60, .18); font: 600 14px/1.5 "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif; }
      .surc-live-banner .dot { width: 10px; height: 10px; border-radius: 50%; background: #e5484d; flex: none;
        animation: surc-live-pulse 1.6s ease-in-out infinite; }
      .surc-live-banner a.go { color: #fff; background: #c73b53; border-radius: 999px; padding: 6px 14px;
        text-decoration: none; white-space: nowrap; flex: none; }
      .surc-live-banner a.go:focus-visible, .surc-live-banner button:focus-visible { outline: 3px solid #c97300; outline-offset: 2px; }
      .surc-live-banner button { border: 0; background: transparent; color: #5a6069; font-size: 18px; line-height: 1;
        cursor: pointer; padding: 4px 6px; flex: none; }
      .surc-live-banner .txt { overflow: hidden; text-overflow: ellipsis; }
      @keyframes surc-live-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
      @media (prefers-reduced-motion: reduce) { .surc-live-banner .dot { animation: none } }
      @media (max-width: 520px) { .surc-live-banner { border-radius: 18px; font-size: 13px; } }
    `;
    document.head.appendChild(style);
  }

  function show(videoId) {
    if (closedFor(videoId)) return hide();
    injectStyle();
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "surc-live-banner";
      banner.setAttribute("role", "status");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      const txt = document.createElement("span");
      txt.className = "txt";
      txt.textContent = "いまYouTubeで「AI相談ライブ」配信中。チャットで気軽にご質問ください";
      const go = document.createElement("a");
      go.className = "go";
      go.target = "_blank";
      go.rel = "noopener noreferrer";
      go.textContent = "見に行く";
      const close = document.createElement("button");
      close.type = "button";
      close.setAttribute("aria-label", "閉じる");
      close.textContent = "×";
      close.addEventListener("click", () => {
        try {
          sessionStorage.setItem(CLOSED_KEY, banner.dataset.videoId || "");
        } catch {
          // 保存できなくても閉じる
        }
        hide();
      });
      banner.append(dot, txt, go, close);
      document.body.appendChild(banner);
    }
    banner.dataset.videoId = videoId;
    banner.querySelector("a.go").href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  }

  function hide() {
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  async function check() {
    try {
      const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return hide();
      const s = await res.json();
      if (s && s.live === true && /^[\w-]{11}$/.test(s.videoId)) show(s.videoId);
      else hide();
    } catch {
      hide();
    }
  }

  check();
  setInterval(() => {
    if (document.visibilityState === "visible") check();
  }, REFRESH_MS);
})();
