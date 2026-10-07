// One-click opt-out link included in every alert: https://keywordtrip.com/api/unsubscribe?t=<sid>
// Deletes the contact (요청 시 즉시 파기) and its saved destinations.
import { config, sb, idFrom } from "./_sub.js";

const page = msg => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>알림 수신 거부 | 키워드트립</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0C1020;color:#f4f4f8;font:16px/1.6 system-ui,sans-serif;padding:24px;box-sizing:border-box;text-align:center}a{color:#ff1faf}</style></head><body><main><p>${msg}</p><p><a href="/">키워드트립으로 돌아가기</a></p></main></body></html>`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("content-type", "text/html; charset=utf-8");
  const cfg = config();
  const id = cfg && idFrom(cfg.secret, req.query && req.query.t);
  if (!id) return res.status(400).send(page("링크가 올바르지 않아요. 받은 메시지의 수신 거부 링크를 다시 눌러 주세요."));
  try {
    await sb(cfg, `kt_subscribers?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    return res.status(200).send(page("알림 수신을 거부했고, 연락처를 삭제했어요."));
  } catch (e) {
    console.error("unsubscribe", String(e).slice(0, 300));
    return res.status(500).send(page("잠시 후 다시 시도해 주세요."));
  }
}
