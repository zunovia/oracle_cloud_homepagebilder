const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 同じ送信者（IPアドレス）から送れるのは1日（日本時間）2回まで
const DAILY_LIMIT = 2;
const LIMIT_MESSAGE = '本日の送信回数の上限（2回）に達しました。お急ぎの場合は info@surc.online まで直接ご連絡ください。';

// 回数の記録先は Upstash Redis（Vercel Marketplace で追加すると KV_REST_API_* が自動で入る）。
// 未設定や障害のときは null を返し、制限なしで送信を続ける（お客様の問い合わせを取りこぼさないため）
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
  return `contact:${day}:${crypto.createHash('sha256').update(ip).digest('hex')}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, message } = req.body || {};

  // 文字列以外（配列・オブジェクト）が送られてきたら受け付けない
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' ||
      (company != null && typeof company !== 'string')) {
    return res.status(400).json({ error: '入力内容が正しくありません' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }

  // 長すぎる入力は弾く（大量の文字を送りつける嫌がらせ・メール部品への負荷を防ぐ）。
  // 上限はフォームの maxlength と合わせてある
  if (name.length > 100 || email.length > 254 || (company || '').length > 100 || message.length > 5000) {
    return res.status(400).json({ error: '入力が長すぎます' });
  }

  // 件名に入る項目は1行に限る（改行でメールヘッダーを壊されないように）
  if (/[\r\n]/.test(name) || /[\r\n]/.test(company || '')) {
    return res.status(400).json({ error: '入力内容が正しくありません' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
  }

  // Vercel は x-real-ip / x-forwarded-for を送信元の実IPで上書きするので、偽装はできない
  const ip = req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = ip ? submissionKey(ip) : null;
  const counted = key ? await redis([['INCR', key], ['EXPIRE', key, 2 * 24 * 3600]]) : null;
  if (counted) {
    if (counted[0].result > DAILY_LIMIT) {
      return res.status(429).json({ error: LIMIT_MESSAGE });
    }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'info@surc.online',
      replyTo: email,
      subject: `【お問い合わせ】${name}様${company ? ' (' + company + ')' : ''} - サーコミュニケーション`,
      text: [
        '━━━━━━━━━━━━━━━━━━━━━━',
        '  ウェブサイトからのお問い合わせ',
        '━━━━━━━━━━━━━━━━━━━━━━',
        '',
        `お名前: ${name}`,
        `メールアドレス: ${email}`,
        `会社名・団体名: ${company || '（未記入）'}`,
        '',
        '【お問い合わせ内容】',
        message,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━',
        'このメールはサーコミュニケーションのウェブサイトから自動送信されました。'
      ].join('\n')
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Email send error:', err.message);
    // 送れなかった分は回数に数えない
    if (counted) await redis([['DECR', key]]);
    res.status(500).json({ error: 'メール送信に失敗しました' });
  }
};
