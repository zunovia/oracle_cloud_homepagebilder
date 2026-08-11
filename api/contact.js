const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
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
    res.status(500).json({ error: 'メール送信に失敗しました' });
  }
};
