const express = require('express');
const compression = require('compression');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 画像・フォント等は1日キャッシュしてよいが、HTML/CSS/JS はファイル名にハッシュを
// 付けていないため長期キャッシュすると、デプロイしても再訪問者に最大1日反映されない。
// no-cache = 毎回サーバーに問い合わせる（変更がなければ304を返すので転送量はほぼゼロ）。
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    if (/\.(html|css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Contact form endpoint
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/api/contact', async (req, res) => {
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
    console.error('Email send error details:', err.code, err.responseCode, err.command);
    res.status(500).json({ error: 'メール送信に失敗しました' });
  }
});

// SMTP接続テスト（デバッグ用）
app.get('/api/contact/test', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ success: true, message: 'SMTP接続OK' });
  } catch (err) {
    console.error('SMTP verify error:', err.message, err.code);
    res.status(500).json({ success: false, error: err.message, code: err.code });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
