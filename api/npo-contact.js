const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 「高次脳機能障害を知る会」（www.npo-nhbd-support.com）の問い合わせフォーム専用の受付口。
// NPO サイトのサーバー（さくらのレンタルサーバ）からはメールが Gmail に届かないため、
// surc.online の送信の仕組みで送る。宛先は固定なので、他人宛ての迷惑メールの中継には使えない。
// 宛先は公開リポジトリに載せないよう、Vercel の環境変数 NPO_CONTACT_TO に置く。

const MAIL_TO = (process.env.NPO_CONTACT_TO || '').trim();
const ALLOWED_ORIGINS = ['https://www.npo-nhbd-support.com', 'https://npo-nhbd-support.com'];

// 同じ送信者（IPアドレス）から送れるのは1日（日本時間）2回まで
const DAILY_LIMIT = 2;

const MESSAGES = {
  ja: {
    ok: 'お問い合わせを受け付けました。内容を確認のうえ、ご連絡いたします。',
    invalid: '入力内容をご確認ください。',
    email: 'メールアドレスの形式をご確認ください。',
    long: '入力が長すぎます。',
    consent: '個人情報の取り扱いへの同意にチェックしてください。',
    limit: '本日の送信回数の上限（2回）に達しました。明日あらためてお送りください。',
    fail: '送信できませんでした。時間をおいてもう一度お試しください。',
    nojs: 'このフォームの送信には JavaScript が必要です。ブラウザの設定で JavaScript を有効にして、もう一度お試しください。'
  },
  en: {
    ok: 'Thank you. Your message has been received. We will get back to you after reviewing it.',
    invalid: 'Please check your input.',
    email: 'Please check the format of your email address.',
    long: 'Your input is too long.',
    consent: 'Please agree to the handling of personal information.',
    limit: 'You have reached today\'s limit (2 messages). Please try again tomorrow.',
    fail: 'Your message could not be sent. Please try again later.',
    nojs: 'This form needs JavaScript. Please enable JavaScript in your browser and try again.'
  },
  pt: {
    ok: 'Obrigado. Sua mensagem foi recebida. Entraremos em contato após analisá-la.',
    invalid: 'Verifique os dados informados.',
    email: 'Verifique o formato do seu e-mail.',
    long: 'O texto informado é muito longo.',
    consent: 'Marque a concordância com o tratamento de dados pessoais.',
    limit: 'Você atingiu o limite de hoje (2 mensagens). Tente novamente amanhã.',
    fail: 'Não foi possível enviar. Tente novamente mais tarde.',
    nojs: 'Este formulário precisa de JavaScript. Ative o JavaScript no navegador e tente novamente.'
  }
};

const KINDS = { self: 'ご本人', family: 'ご家族', supporter: '支援者・専門職', other: 'その他' };

// 回数の記録先は api/contact.js と同じ Upstash Redis（キーの頭を変えて別に数える）。
// 未設定や障害のときは null を返し、制限なしで送信を続ける（問い合わせを取りこぼさないため）
async function redis(commands) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3000)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const results = await r.json();
    const failed = results.find((x) => x.error);
    if (failed) throw new Error(failed.error);
    return results;
  } catch (err) {
    console.error('Rate limit store error:', err.message);
    return null;
  }
}

// IPアドレスはそのまま保存せずハッシュにし、日付ごとのキーで数える（2日で自動削除）
function submissionKey(ip) {
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return `npo-contact:${day}:${crypto.createHash('sha256').update(ip).digest('hex')}`;
}

module.exports = async function handler(req, res) {
  // NPO サイトのページから送られたものだけ受け付ける（ブラウザに結果を読ませるための CORS もここで許可）
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);

  if (req.method === 'OPTIONS') {
    if (!allowed) return res.status(403).end();
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const lang = typeof body.lang === 'string' && MESSAGES[body.lang] ? body.lang : 'ja';
  const m = MESSAGES[lang];
  const reply = (status, ok, message) => res.status(status).json({ ok, message });

  if (req.method !== 'POST') return reply(405, false, m.invalid);
  if (!allowed) return reply(403, false, m.invalid);

  // JavaScript が動かないと「開いてからの秒数」が付かない。黙って捨てずに案内を返す
  if (body.elapsed === undefined) return reply(400, false, m.nojs);

  // 見えない入力欄に何か入っている・開いてすぐ送信された → 機械による送信とみなし、送らずに完了を装う
  const elapsed = parseInt(body.elapsed, 10) || 0;
  if ((typeof body.website === 'string' && body.website.trim() !== '') || elapsed < 3) {
    return reply(200, true, m.ok);
  }

  const { name, email, kind, message, consent } = body;

  // 文字列以外（配列・オブジェクト）が送られてきたら受け付けない
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' ||
      (kind != null && typeof kind !== 'string') || (consent != null && typeof consent !== 'string')) {
    return reply(400, false, m.invalid);
  }
  if (!name.trim() || !email.trim() || !message.trim()) return reply(400, false, m.invalid);
  if (consent !== 'yes') return reply(400, false, m.consent);

  // 長すぎる入力は弾く。上限はフォームの maxlength と合わせてある
  if (name.length > 100 || email.length > 254 || message.length > 5000) return reply(400, false, m.long);

  // 件名や返信先に入る項目は1行に限る（改行でメールのヘッダーを壊されないように）
  if (/[\r\n]/.test(name) || /[\r\n]/.test(email)) return reply(400, false, m.invalid);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return reply(400, false, m.email);

  const kindLabel = KINDS[kind] || 'その他';

  // 宛先が設定されていなければ送らない（設定漏れに気づけるようログに残す）
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(MAIL_TO)) {
    console.error('NPO_CONTACT_TO is not set');
    return reply(500, false, m.fail);
  }

  // Vercel は x-real-ip / x-forwarded-for を送信元の実IPで上書きするので、偽装はできない
  const ip = req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = ip ? submissionKey(ip) : null;
  const counted = key ? await redis([['INCR', key], ['EXPIRE', key, 2 * 24 * 3600]]) : null;
  if (counted && counted[0].result > DAILY_LIMIT) return reply(429, false, m.limit);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const received = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: MAIL_TO,
      replyTo: email.trim(),
      subject: `【NPOサイト】お問い合わせ（${kindLabel}）${name.trim()} 様 - 高次脳機能障害を知る会`,
      text: [
        '高次脳機能障害を知る会（www.npo-nhbd-support.com）のお問い合わせフォームから、次の内容が届きました。',
        '',
        `お名前　　: ${name.trim()}`,
        `メール　　: ${email.trim()}`,
        `ご立場　　: ${kindLabel}`,
        `表示言語　: ${lang}`,
        `受付日時　: ${received}（日本時間）`,
        '',
        '【お問い合わせ内容】',
        message.trim(),
        '',
        '――',
        'このメールに返信すると、お問い合わせの方へ届きます。'
      ].join('\n')
    });
    return reply(200, true, m.ok);
  } catch (err) {
    console.error('NPO contact send error:', err.message);
    // 送れなかった分は回数に数えない
    if (counted) await redis([['DECR', key]]);
    return reply(500, false, m.fail);
  }
};
