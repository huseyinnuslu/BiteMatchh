import nodemailer from 'nodemailer';
import { resolve4 } from 'node:dns/promises';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Swipe from '../models/Swipe.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import SupportRequest from '../models/SupportRequest.js';
import LocationShare from '../models/LocationShare.js';
import generateToken from '../utils/generateToken.js';

// ─── Google OAuth2 client ───────────────────────────────────────────────────
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const LEGAL_CONSENT_VERSION = '2026-08-14-v2';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GMAIL_SETUP_MAX_AGE_MS = 10 * 60 * 1000;

// ─── Yardımcı: 6 haneli OTP üret ───────────────────────────────────────────
const generateOTP = () => String(randomInt(100000, 1000000));

// ─── Yardımcı: Nodemailer transporter ──────────────────────────────────────
const createTransporter = async () => {
  // Nodemailer kendi DNS fallback mekanizmasında IPv6'yı da deneyebiliyor.
  // Render'ın IPv6 çıkışı olmadığı için SMTP ana bilgisayarını özellikle A kaydından alıyoruz.
  const [smtpIpv4] = await resolve4('smtp.gmail.com');

  if (!smtpIpv4) {
    throw new Error('Gmail SMTP için IPv4 adresi bulunamadı');
  }

  return nodemailer.createTransport({
    host: smtpIpv4,
    port: 465,
    secure: true,
    tls: { servername: 'smtp.gmail.com' },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const getEmailProvider = () => process.env.EMAIL_PROVIDER?.trim().toLowerCase();

const hasGmailApiClient = () =>
  Boolean(
    process.env.GMAIL_API_CLIENT_ID &&
      process.env.GMAIL_API_CLIENT_SECRET &&
      process.env.GMAIL_API_REDIRECT_URI
  );

const isGmailApiConfigured = () =>
  hasGmailApiClient() &&
  Boolean(process.env.GMAIL_API_REFRESH_TOKEN && process.env.EMAIL_FROM);

export const isEmailConfigured = () => {
  const provider = getEmailProvider();

  if (provider === 'gmail_api') return isGmailApiConfigured();
  if (provider === 'brevo') return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
  if (provider === 'resend') return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

  // Eski ortam değişkenleri kullanılan kurulumlarda mevcut önceliği koru.
  return process.env.BREVO_API_KEY || process.env.RESEND_API_KEY
    ? Boolean(process.env.EMAIL_FROM)
    : Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const getEmailFrom = () =>
  process.env.EMAIL_FROM || `"BiteMatch 🍽️" <${process.env.EMAIL_USER}>`;

const getBrevoSender = () => {
  const from = getEmailFrom();
  const match = from.match(/^(?:"?(.+?)"?\s*)?<([^>]+)>$/);

  return match
    ? { name: match[1]?.trim() || 'BiteMatch', email: match[2].trim() }
    : { name: 'BiteMatch', email: from.trim() };
};

const createGmailApiClient = () =>
  new OAuth2Client(
    process.env.GMAIL_API_CLIENT_ID,
    process.env.GMAIL_API_CLIENT_SECRET,
    process.env.GMAIL_API_REDIRECT_URI
  );

const base64Url = (value) =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const safeHeader = (value = '') => String(value).replace(/[\r\n]+/g, ' ').trim();

const encodeHeader = (value) => `=?UTF-8?B?${Buffer.from(safeHeader(value), 'utf8').toString('base64')}?=`;

const createGmailRawMessage = (mailOptions) => {
  const boundary = `bitematch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const text = Buffer.from(mailOptions.text || '', 'utf8').toString('base64');
  const html = Buffer.from(mailOptions.html || '', 'utf8').toString('base64');

  return [
    `From: ${safeHeader(mailOptions.from)}`,
    `To: ${safeHeader(mailOptions.to)}`,
    `Subject: ${encodeHeader(mailOptions.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
};

const sendWithGmailApi = async (mailOptions) => {
  const gmailClient = createGmailApiClient();
  gmailClient.setCredentials({ refresh_token: process.env.GMAIL_API_REFRESH_TOKEN });

  let accessToken;
  try {
    accessToken = await gmailClient.getAccessToken();
  } catch (error) {
    // Google'ın refresh token'ı iptal edildiğinde teknik `invalid_grant`
    // yanıtını son kullanıcıya yansıtmıyoruz. Yönetici token'ı yenileyene
    // kadar işlemin neden yapılamadığını açıkça belirtiriz.
    if (String(error?.message || '').includes('invalid_grant')) {
      throw new Error('E-posta gönderim bağlantısı yenilenmeli. Lütfen biraz sonra tekrar deneyin.');
    }
    throw error;
  }
  if (!accessToken.token) {
    throw new Error('Gmail API erişim belirteci alınamadı');
  }

  const response = await fetch(GMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Url(createGmailRawMessage(mailOptions)) }),
  });

  if (!response.ok) {
    throw new Error(`Gmail API e-posta hatası: ${await response.text()}`);
  }

  return response.json();
};

// Render'ın ücretsiz servisleri SMTP portlarını engellediği için üretimde Resend'in
// HTTPS API'si kullanılır. SMTP fallback'i yerel geliştirme ve ücretli sunucular için korunur.
const sendEmail = async (mailOptions) => {
  const provider = getEmailProvider();

  if (provider === 'gmail_api') {
    if (!isGmailApiConfigured()) {
      throw new Error('Gmail API e-posta ayarları eksik');
    }

    return sendWithGmailApi(mailOptions);
  }

  if (provider === 'brevo' || (!provider && process.env.BREVO_API_KEY)) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: getBrevoSender(),
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
        textContent: mailOptions.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo e-posta hatası: ${await response.text()}`);
    }

    return response.json();
  }

  if (provider === 'resend' || (!provider && process.env.RESEND_API_KEY)) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailOptions.from,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend e-posta hatası: ${await response.text()}`);
    }

    return response.json();
  }

  const transporter = await createTransporter();
  return transporter.sendMail(mailOptions);
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createGmailSetupState = () => {
  const setupToken = process.env.GMAIL_API_SETUP_TOKEN;
  if (!setupToken) {
    throw new Error('Gmail API geçici kurulum anahtarı eksik');
  }

  const payload = base64Url(JSON.stringify({ issuedAt: Date.now() }));
  const signature = createHmac('sha256', setupToken).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const isValidGmailSetupState = (state) => {
  const setupToken = process.env.GMAIL_API_SETUP_TOKEN;
  const [payload, signature] = String(state || '').split('.');
  if (!setupToken || !payload || !signature) return false;

  const expectedSignature = createHmac('sha256', setupToken).update(payload).digest('base64url');
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return false;
  }

  try {
    const { issuedAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(issuedAt) && Date.now() - issuedAt >= 0 && Date.now() - issuedAt <= GMAIL_SETUP_MAX_AGE_MS;
  } catch {
    return false;
  }
};

// Bu iki rota yalnızca geçici test kurulumunda refresh token üretmek içindir.
// GMAIL_API_SETUP_TOKEN kaldırılınca ikisi de tamamen devre dışı kalır.
export const startGmailApiAuthorization = (req, res, next) => {
  try {
    const suppliedToken = String(req.query.setupToken || '');
    const configuredToken = String(process.env.GMAIL_API_SETUP_TOKEN || '');
    const supplied = Buffer.from(suppliedToken);
    const configured = Buffer.from(configuredToken);

    if (
      !configuredToken ||
      supplied.length !== configured.length ||
      !timingSafeEqual(supplied, configured)
    ) {
      res.status(404);
      throw new Error('Kurulum bağlantısı bulunamadı');
    }

    if (!hasGmailApiClient()) {
      res.status(503);
      throw new Error('Gmail API istemci ayarları eksik');
    }

    const gmailClient = createGmailApiClient();
    const authorizationUrl = gmailClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [GMAIL_SEND_SCOPE],
      state: createGmailSetupState(),
    });

    res.redirect(authorizationUrl);
  } catch (error) {
    next(error);
  }
};

export const completeGmailApiAuthorization = async (req, res, next) => {
  try {
    if (!isValidGmailSetupState(req.query.state)) {
      res.status(400);
      throw new Error('Gmail kurulum isteğinin süresi doldu veya geçersiz');
    }

    if (req.query.error) {
      res.status(400);
      throw new Error('Gmail yetkisi verilmedi');
    }

    if (!req.query.code || !hasGmailApiClient()) {
      res.status(400);
      throw new Error('Gmail yetkilendirme kodu veya istemci ayarları eksik');
    }

    const gmailClient = createGmailApiClient();
    const { tokens } = await gmailClient.getToken(req.query.code);
    if (!tokens.refresh_token) {
      res.status(400);
      throw new Error('Gmail kalıcı erişim anahtarı üretilemedi. Kurulum bağlantısını tekrar açıp izin verin.');
    }

    res.set({
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
    });
    res.type('html').send(`<!doctype html>
      <html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gmail kurulum tamamlandı</title></head>
      <body style="margin:0;background:#0f172a;color:#f8fafc;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px">
        <main style="width:min(680px,100%);background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;box-sizing:border-box">
          <h1 style="margin-top:0">Gmail bağlantısı hazır</h1>
          <p>Bu anahtarı yalnızca Render'da <code>GMAIL_API_REFRESH_TOKEN</code> olarak kaydedin. Sonra bu sayfayı kapatın ve geçici kurulum anahtarını silin.</p>
          <textarea readonly aria-label="Gmail refresh token" style="width:100%;min-height:112px;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #64748b;background:#020617;color:#f8fafc">${escapeHtml(tokens.refresh_token)}</textarea>
          <p style="color:#fbbf24;margin-bottom:0">Bu değer gizlidir; GitHub'a, sohbet mesajına veya ekran görüntüsüne koymayın.</p>
        </main>
      </body></html>`);
  } catch (error) {
    next(error);
  }
};

// Kayıt akışını e-posta sağlayıcısına bağımlı bırakmadan, yalnızca yeni
// gerçek kullanıcılara hoş geldin e-postası gönderir.
const sendWelcomeEmail = async (user) => {
  if (!isEmailConfigured() || !user?.email) {
    console.warn('Hoş geldin e-postası atlandı: e-posta yapılandırması eksik.');
    return false;
  }

  const username = escapeHtml(user.username || user.name || 'BiteMatch kullanıcısı');
  const appUrl = process.env.FRONTEND_URL || 'https://bite-matchh.vercel.app';

  try {
    await sendEmail({
      from: getEmailFrom(),
      to: user.email,
      subject: "BiteMatch'e Hoş Geldin! 🎉",
      text: `Merhaba ${user.username || user.name},\n\nBiteMatch ailesine katıldığın için çok mutluyuz! Artık arkadaş grubunla "Bana Fark Etmez Ya!" krizlerine son verebilirsin.\n\nUygulamayı hemen incelemeye başlayabilir, odanı kurup arkadaşlarınla eşleşmenin tadını çıkarabilirsin.\n\nKeyifli eşleşmeler dileriz!\nBiteMatch Ekibi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 36px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 34px; margin-bottom: 8px;">🍽️</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">BiteMatch'e Hoş Geldin! 🎉</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 18px;">Merhaba <strong>${username}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 18px;">BiteMatch ailesine katıldığın için çok mutluyuz! Artık arkadaş grubunla <strong>“Bana Fark Etmez Ya!”</strong> krizlerine son verebilirsin.</p>
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 28px;">Uygulamayı hemen incelemeye başlayabilir, odanı kurup arkadaşlarınla eşleşmenin tadını çıkarabilirsin.</p>
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${appUrl}" style="display: inline-block; padding: 13px 22px; border-radius: 10px; background: #ff4b4b; color: #ffffff; text-decoration: none; font-weight: 700;">BiteMatch'i Keşfet</a>
          </div>
          <p style="font-size: 16px; line-height: 1.7; margin: 0;">Keyifli eşleşmeler dileriz!<br/><strong>BiteMatch Ekibi</strong></p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    // E-posta hatası kaydı veya Google kaydını geri almamalı.
    console.error('Hoş geldin e-postası gönderilemedi:', error.message);
    return false;
  }
};

const sendWelcomeEmailIfNeeded = async (user) => {
  if (!user || user.welcomeEmailSentAt) {
    return;
  }

  const sent = await sendWelcomeEmail(user);
  if (sent) {
    user.welcomeEmailSentAt = new Date();
    await user.save({ validateBeforeSave: false });
  }
};

const sendRegistrationVerificationEmail = async (user, otp) => {
  if (!isEmailConfigured()) {
    throw new Error('E-posta doğrulama servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
  }

  const username = escapeHtml(user.username || user.name || 'BiteMatch kullanıcısı');
  await sendEmail({
    from: getEmailFrom(),
    to: user.email,
    subject: 'BiteMatch – E-posta Doğrulama Kodu',
    text: `Merhaba ${user.username || user.name}, BiteMatch hesabını etkinleştirmek için kodun: ${otp}. Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan işlem yapma.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f172a;color:#f8fafc;border-radius:16px">
      <h1 style="color:#ff4b4b;margin-top:0">BiteMatch</h1>
      <h2>E-posta adresini doğrula</h2>
      <p>Merhaba <strong>${username}</strong>, hesabını etkinleştirmek için aşağıdaki 6 haneli kodu BiteMatch'e gir.</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ff4b4b;padding:18px;background:#1e293b;border-radius:12px;text-align:center">${otp}</div>
      <p style="color:#94a3b8">Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı görmezden gelebilirsin.</p>
    </div>`,
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Yeni kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
// Optimizasyon: 2 ayrı findOne yerine tek $or sorgusu (1 DB round-trip tasarrufu)
// ──────────────────────────────────────────────────────────────────────────────
export const registerUser = async (req, res, next) => {
  try {
    const { name, password, role, termsAccepted, privacyNoticeAcknowledged } = req.body;
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Lutfen tum alanlari doldurun');
    }

    if (termsAccepted !== true) {
      res.status(400);
      throw new Error('Kayıt olmak için Kullanıcı Sözleşmesi kabulü zorunludur.');
    }

    if (privacyNoticeAcknowledged !== true) {
      res.status(400);
      throw new Error('Kayıt olmak için KVKK Aydınlatma Metni hakkında bilgilendirildiğini onaylamalısın.');
    }

    // Kullanici adi regex kontrolu (DB'ye gitmeden once)
    const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;
    if (!usernameRegex.test(username)) {
      res.status(400);
      throw new Error(
        'Kullanici adi 3-15 karakter olmali, harf/rakam/alt cizgi/nokta icermeli.'
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Geçerli bir e-posta adresi girin.');
    }

    // Sifre guclukluk kontrolu (DB'ye gitmeden once)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error(
        'Sifre en az 8 karakter, 1 buyuk harf, 1 kucuk harf ve 1 rakam icermeli!'
      );
    }

    // TEK sorguyla hem username hem email cakismasini kontrol et
    let existing = await User.findOne(
      {
        $or: [
          { email },
          { $expr: { $eq: [{ $toLower: '$username' }, username.toLowerCase()] } },
        ],
      },
      'username email isEmailVerified pendingAccountExpiresAt'
    );

    // Daha önce kodu girmeden yarım bırakılan kayıt süreyi geçtiyse yeni
    // denemeyi engellemez. TTL temizliği kısa bir gecikmeyle çalışabileceği
    // için burada da kesin temizlik yapıyoruz.
    if (existing?.isEmailVerified === false && existing.pendingAccountExpiresAt && existing.pendingAccountExpiresAt <= new Date()) {
      await existing.deleteOne();
      existing = null;
    }

    if (existing) {
      res.status(400);
      throw new Error(
        existing.email === email
          ? 'Bu e-posta adresi ile zaten bir hesap mevcut!'
          : 'Bu kullanici adi zaten alinmis!'
      );
    }

    if (!isEmailConfigured()) {
      res.status(503);
      throw new Error('E-posta doğrulama servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }

    const otp = generateOTP();
    const now = Date.now();
    const user = await User.create({
      name: name || username,
      username,
      email,
      password,
      role: role || 'Host',
      isEmailVerified: false,
      emailVerificationToken: otp,
      emailVerificationExpire: new Date(now + 10 * 60 * 1000),
      emailVerificationLastSentAt: new Date(now),
      pendingAccountExpiresAt: new Date(now + 30 * 60 * 1000),
      legalConsent: {
        termsAcceptedAt: new Date(),
        kvkkAcknowledgedAt: new Date(),
        version: LEGAL_CONSENT_VERSION,
      },
    });

    try {
      await sendRegistrationVerificationEmail(user, otp);
    } catch (mailError) {
      // Kod gönderilemezse kullanıcı hesabı yaratılmış sayılmaz; sahte ya da
      // ulaşılamayan bir e-posta hiçbir kullanıcı adını rezerve edemez.
      await user.deleteOne();
      throw mailError;
    }

    res.status(201).json({
      email: user.email,
      requiresEmailVerification: true,
      message: 'Doğrulama kodu e-posta adresine gönderildi. Kodu girmeden hesabın etkinleşmez.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    E-posta ile açılan hesabı 6 haneli kodla etkinleştir
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyRegistrationEmail = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otp = String(req.body?.otp || '').trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'E-posta adresi ve 6 haneli doğrulama kodu zorunludur.' });
    }

    const user = await User.findOne({
      email,
      isEmailVerified: false,
      emailVerificationToken: otp,
      emailVerificationExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    user.emailVerificationLastSentAt = undefined;
    user.pendingAccountExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    // Kayıt doğrulama ekranından çıkmadan önce e-posta gönderimini başlat.
    // Arka plana bırakılan işlem ücretsiz Render instance'ının uykuya geçişi
    // gibi durumlarda bazen tamamlanmadan kesilebiliyordu.
    await sendWelcomeEmailIfNeeded(user);

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Kayıt doğrulama kodunu yeniden gönder
// @route   POST /api/auth/verify-email/resend
// @access  Public
export const resendRegistrationVerification = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = await User.findOne({ email, isEmailVerified: false });

    // Hesap var/yok bilgisini dışarı vermeden güvenli yanıt.
    if (!user) {
      return res.json({ message: 'Bu adres için bekleyen doğrulama varsa yeni kod gönderildi.' });
    }

    const lastSentAt = user.emailVerificationLastSentAt?.getTime() || 0;
    const waitMs = 60 * 1000 - (Date.now() - lastSentAt);
    if (waitMs > 0) {
      return res.status(429).json({ message: `Yeni kod için ${Math.ceil(waitMs / 1000)} saniye bekleyin.` });
    }

    const otp = generateOTP();
    const now = Date.now();
    user.emailVerificationToken = otp;
    user.emailVerificationExpire = new Date(now + 10 * 60 * 1000);
    user.emailVerificationLastSentAt = new Date(now);
    user.pendingAccountExpiresAt = new Date(now + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendRegistrationVerificationEmail(user, otp);

    res.json({ message: 'Yeni doğrulama kodu e-posta adresine gönderildi.' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanici girisi & Token alma
// @route   POST /api/auth/login
// @access  Public
// Optimizasyon: select() ile sadece gerekli alanlar cekilir
// ──────────────────────────────────────────────────────────────────────────────
export const loginUser = async (req, res, next) => {
  try {
    // identifier: e-posta VEYA kullanici adi kabul edilir
    const { email, identifier, password } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      res.status(400);
      throw new Error('E-posta/kullanici adi ve sifre zorunludur');
    }

    // $or sorgusu: hem email hem username ile eslisir
    const user = await User.findOne({
      $or: [{ email: loginId }, { username: loginId }],
    }).select('_id name username email role password isEmailVerified');

    if (user && (await user.matchPassword(password))) {
      if (user.isEmailVerified === false) {
        const error = new Error('E-posta adresini doğrulamadan giriş yapamazsın. Kayıt ekranındaki kodu gir.');
        error.code = 'EMAIL_NOT_VERIFIED';
        error.email = user.email;
        res.status(403);
        throw error;
      }
      // İlk hoş geldin e-postası geçici bir sağlayıcı hatası nedeniyle
      // gönderilemediyse, kullanıcıyı hiçbir işlem yapmaya zorlamadan güvenli
      // girişte bir kez daha deneriz. Gönderilmiş hesaplarda zaman damgası
      // bulunduğundan tekrar e-posta atılmaz.
      await sendWelcomeEmailIfNeeded(user);
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Gecersiz e-posta/kullanici adi veya sifre');
    }
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Misafir girişi (geçici kullanıcı oluştur)
// @route   POST /api/auth/guest
// @access  Public
// ──────────────────────────────────────────────────────────────────────────────
export const guestLogin = async (req, res, next) => {
  try {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const username = `Misafir_${randomNum}`;
    const email = `guest_${randomNum}@bitematch.com`;
    const password = `guest_pass_${randomNum}`;

    const user = await User.create({
      name: username,
      username,
      email,
      password,
      role: 'Guest',
      isEmailVerified: true,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Misafir kullanıcısı oluşturulamadı');
    }
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanıcı profilini güncelle
// @route   PUT /api/auth/profile
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const isUsernameUpdateRequested = Object.prototype.hasOwnProperty.call(req.body, 'username');

      if (isUsernameUpdateRequested) {
        const requestedUsername = typeof req.body.username === 'string'
          ? req.body.username.trim()
          : '';
        const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;

        if (!usernameRegex.test(requestedUsername)) {
          res.status(400);
          throw new Error('Kullanici adi 3-15 karakter olmali; sadece harf, rakam, alt cizgi ve nokta icerebilir.');
        }

        if (requestedUsername !== user.username) {
          const now = Date.now();
          const previousChangeAt = user.usernameChangedAt?.getTime();

          if (previousChangeAt && now - previousChangeAt < 7 * 24 * 60 * 60 * 1000) {
            const remainingDays = Math.ceil((7 * 24 * 60 * 60 * 1000 - (now - previousChangeAt)) / (24 * 60 * 60 * 1000));
            res.status(429);
            throw new Error('Kullanici adinizi ' + remainingDays + ' gun sonra tekrar degistirebilirsiniz.');
          }

          const existingUsername = await User.findOne({
            _id: { $ne: user._id },
            $expr: { $eq: [{ $toLower: '$username' }, requestedUsername.toLowerCase()] },
          }).select('_id').lean();

          if (existingUsername) {
            res.status(409);
            throw new Error('Bu kullanici adi zaten alinmis. Lutfen baska bir ad deneyin.');
          }

          user.username = requestedUsername;
          user.usernameChangedAt = new Date(now);
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
        res.status(400);
        throw new Error('E-posta değişikliği yeni adres doğrulanarak yapılmalıdır.');
      }

      if (req.body.isStatsPublic !== undefined) {
        user.isStatsPublic = req.body.isStatsPublic;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePic: updatedUser.profilePic,
        isStatsPublic: updatedUser.isStatsPublic,
        usernameChangedAt: updatedUser.usernameChangedAt,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Mevcut şifre doğrulanarak yeni şifre belirle
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mevcut şifre ve yeni şifre zorunludur.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Yeni şifre en az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermelidir.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Mevcut şifre doğru değil.' });
    }

    if (await user.matchPassword(newPassword)) {
      return res.status(400).json({ message: 'Yeni şifre mevcut şifrenle aynı olamaz.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Şifren başarıyla güncellendi.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Google ile ilk kayıttan sonra kullanıcı adı belirle
// @route   POST /api/auth/complete-username
// @access  Private
export const completeUsernameOnboarding = async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.replace(/\s+/g, ' ').trim() : '';
    const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;
    const nameParts = name.split(' ').filter(Boolean);

    if (!usernameRegex.test(username)) {
      res.status(400);
      throw new Error('Kullanıcı adı 3-15 karakter olmalı; yalnızca harf, rakam, alt çizgi ve nokta içerebilir.');
    }

    if (name.length < 3 || name.length > 60 || nameParts.length < 2) {
      res.status(400);
      throw new Error('Lütfen adını ve soyadını gir.');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    if (!user.usernameOnboardingRequired) {
      res.status(409);
      throw new Error('Kullanıcı adın zaten oluşturulmuş. Değişiklik için profil ayarlarını kullan.');
    }

    const existingUsername = await User.findOne({
      _id: { $ne: user._id },
      $expr: { $eq: [{ $toLower: '$username' }, username.toLowerCase()] },
    }).select('_id').lean();

    if (existingUsername) {
      res.status(409);
      throw new Error('Bu kullanıcı adı zaten alınmış. Lütfen başka bir ad deneyin.');
    }

    user.name = name;
    user.username = username;
    user.usernameOnboardingRequired = false;
    // İlk seçim, 7 günlük kullanıcı adı değiştirme sınırını başlatmaz.
    user.usernameChangedAt = null;
    await user.save();

    // Google ile ilk kayıtta kullanıcı adı bu adımda tamamlanır. Hoş geldin
    // e-postasını yanıt dönmeden önce başlatırız; ücretsiz instance'ın uykuya
    // geçmesi nedeniyle arka plan görevinin kaybolmasına izin vermeyiz.
    await sendWelcomeEmailIfNeeded(user);

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      usernameOnboardingRequired: false,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const requestEmailChange = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Geçerli bir e-posta adresi girin.' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    if (email === user.email.toLowerCase()) return res.status(400).json({ message: 'Bu adres zaten hesabında kayıtlı.' });
    const emailInUse = await User.findOne({ _id: { $ne: user._id }, email }).select('_id').lean();
    if (emailInUse) return res.status(409).json({ message: 'Bu e-posta adresi başka bir hesapta kullanılıyor.' });
    if (!isEmailConfigured()) return res.status(503).json({ message: 'E-posta doğrulama servisi şu anda kullanılamıyor.' });

    const otp = generateOTP();
    user.pendingEmail = email;
    user.emailChangeToken = otp;
    user.emailChangeExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendEmail({
      from: getEmailFrom(), to: email, subject: 'BiteMatch – E-posta Değişikliği Doğrulama Kodu',
      text: `Merhaba ${user.username}, BiteMatch e-posta adresini değiştirmek için kodun: ${otp}. Kod 10 dakika geçerlidir.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f172a;color:#f8fafc;border-radius:16px"><h1 style="color:#ff4b4b">BiteMatch</h1><h2>E-posta değişikliğini doğrula</h2><p>Yeni giriş adresini onaylamak için aşağıdaki kodu BiteMatch'e gir.</p><div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ff4b4b;padding:18px;background:#1e293b;border-radius:12px;text-align:center">${otp}</div><p style="color:#94a3b8">Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan görmezden gelebilirsin.</p></div>`,
    });
    res.json({ message: `Doğrulama kodu ${email} adresine gönderildi.` });
  } catch (error) { next(error); }
};

export const confirmEmailChange = async (req, res, next) => {
  try {
    const otp = String(req.body?.otp || '').trim();
    const user = await User.findById(req.user._id);
    if (!user || !user.pendingEmail || user.emailChangeToken !== otp || !user.emailChangeExpire || user.emailChangeExpire <= new Date()) {
      return res.status(400).json({ message: 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.' });
    }
    const emailInUse = await User.findOne({ _id: { $ne: user._id }, email: user.pendingEmail }).select('_id').lean();
    if (emailInUse) return res.status(409).json({ message: 'Bu e-posta adresi başka bir hesapta kullanılmaya başlandı.' });
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailChangeToken = undefined;
    user.emailChangeExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ message: 'Giriş e-postan doğrulandı ve güncellendi.', email: user.email });
  } catch (error) { next(error); }
};

// Hesap silme iki adımlıdır: kod yalnızca hesaba kayıtlı e-postaya gider.
export const requestAccountDeletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    if (!isEmailConfigured()) return res.status(503).json({ message: 'E-posta doğrulama servisi şu anda kullanılamıyor.' });

    const otp = generateOTP();
    user.accountDeletionToken = otp;
    user.accountDeletionExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendEmail({
      from: getEmailFrom(), to: user.email, subject: 'BiteMatch – Hesap Silme Doğrulama Kodu',
      text: `Merhaba ${user.username}, BiteMatch hesabını silmek için kodun: ${otp}. Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan işlem yapma.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0f172a;color:#f8fafc;border-radius:16px"><h1 style="color:#ff4b4b">BiteMatch</h1><h2>Hesap silmeyi doğrula</h2><p>Bu işlem hesabını ve kişisel verilerini kalıcı olarak siler.</p><div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ff4b4b;padding:18px;background:#1e293b;border-radius:12px;text-align:center">${otp}</div><p style="color:#94a3b8">Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan görmezden gel.</p></div>`,
    });
    res.json({ message: 'Doğrulama kodu kayıtlı e-posta adresine gönderildi.' });
  } catch (error) { next(error); }
};

// Kullanıcının uygulamada tuttuğumuz kişisel verilerini taşınabilir JSON olarak
// dışa aktarır. Şifre, oturum ve doğrulama anahtarları kesinlikle dahil edilmez.
export const exportPersonalData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [user, swipes, rooms, messages, notifications, supportRequests] = await Promise.all([
      User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire -emailChangeToken -emailChangeExpire -accountDeletionToken -accountDeletionExpire -pushSubscription').lean(),
      Swipe.find({ user: userId }).lean(),
      Room.find({ participants: userId }).lean(),
      Message.find({ $or: [{ sender: userId }, { recipient: userId }] }).lean(),
      Notification.find({ user: userId }).lean(),
      SupportRequest.find({ user: userId }).lean(),
    ]);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="bitematch-verilerim-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    });
    res.json({
      exportedAt: new Date().toISOString(),
      profile: user,
      swipes,
      rooms,
      directMessages: messages,
      notifications,
      supportRequests,
    });
  } catch (error) { next(error); }
};

export const deleteOwnAccount = async (req, res, next) => {
  try {
    const otp = String(req.body?.otp || '').trim();
    const user = await User.findById(req.user._id);
    if (!user || user.accountDeletionToken !== otp || !user.accountDeletionExpire || user.accountDeletionExpire <= new Date()) {
      return res.status(400).json({ message: 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.' });
    }

    const userId = user._id;
    const hostedRoomIds = (await Room.find({ host: userId }).select('_id').lean()).map((room) => room._id);
    const avatarBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' });
    const avatarFiles = await avatarBucket.find({ 'metadata.userId': userId.toString() }).toArray();
    await Promise.all([
      Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }, { room: { $in: hostedRoomIds } }] }),
      Swipe.deleteMany({ $or: [{ user: userId }, { room: { $in: hostedRoomIds } }] }),
      Notification.deleteMany({ user: userId }),
      SupportRequest.deleteMany({ user: userId }),
      LocationShare.deleteMany({ user: userId }),
      Room.deleteMany({ _id: { $in: hostedRoomIds } }),
      Room.updateMany({ participants: userId }, { $pull: { participants: userId } }),
      User.updateMany({}, { $pull: { friends: userId, followers: userId, following: userId, pendingFriendRequests: userId, blockedUsers: userId } }),
      ...avatarFiles.map((file) => avatarBucket.delete(file._id)),
    ]);
    await user.deleteOne();
    res.json({ message: 'Hesabın ve kişisel verilerin silindi.' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Şifre sıfırlama – Adım 1: E-postaya 6 haneli OTP gönder
// @route   POST /api/auth/forgot-password
// @access  Public
// ──────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('E-posta adresi zorunludur');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı');
    }
    if (user.isEmailVerified === false) {
      res.status(403);
      throw new Error('Önce kayıt e-posta adresini doğrulamalısın.');
    }

    // 6 haneli OTP kodu üret ve hash'le
    const otp = generateOTP();
    const hashedOtp = otp; // Düz metin saklıyoruz (kısa süreli)
    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika
    await user.save({ validateBeforeSave: false });

    const mailOptions = {
      from: getEmailFrom(),
      to: user.email,
      subject: 'BiteMatch – Şifre Sıfırlama Kodu',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px 36px; border-radius: 16px; border: 1px solid #1e293b;">
          
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ff4b4b; font-size: 28px; margin: 0 0 8px;">🍽️ BiteMatch</h1>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">Grup Karar Motoru</p>
          </div>

          <h2 style="font-size: 20px; margin: 0 0 12px; color: #f1f5f9;">Şifre Sıfırlama Kodu</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 28px;">
            Merhaba <strong style="color: #fff;">${user.username}</strong>,<br/>
            Şifre sıfırlama talebinde bulundunuz. Aşağıdaki <strong>6 haneli kodu</strong> uygulamaya girin.
            Bu kod <strong style="color: #ff4b4b;">10 dakika</strong> içinde geçerliliğini yitirecektir.
          </p>

          <div style="background: #1e293b; border: 2px dashed #ff4b4b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px; letter-spacing: 2px; text-transform: uppercase;">Doğrulama Kodunuz</p>
            <p style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #ff4b4b; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0; border-top: 1px solid #1e293b; padding-top: 20px;">
            Bu isteği siz yapmadıysanız bu e-postayı güvenle görmezden gelebilirsiniz. 
            Hesabınız güvende olmaya devam edecektir.
          </p>
        </div>
      `,
    };

    if (!isEmailConfigured()) {
      throw new Error('E-posta servisi yapılandırılmamış');
    }

    await sendEmail(mailOptions);

    res.json({
      message: `Doğrulama kodu ${email} adresine gönderildi. 10 dakika içinde girmeniz gerekmektedir.`,
    });
  } catch (error) {
    // Mail gönderilemezse token'ı temizle
    try {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      }
    } catch (_) {}
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Şifre sıfırlama – Adım 2: OTP kodunu ve yeni şifreyi doğrula
// @route   POST /api/auth/reset-password
// @access  Public
// ──────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400);
      throw new Error('E-posta, doğrulama kodu ve yeni şifre zorunludur');
    }

    // OTP ve süre kontrolü
    const user = await User.findOne({
      email,
      isEmailVerified: { $ne: false },
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error(
        'Doğrulama kodu hatalı veya süresi dolmuş. Lütfen yeni kod isteyin.'
      );
    }

    // Şifre güçlülük kontrolü
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400);
      throw new Error(
        'Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir!'
      );
    }

    // Yeni şifreyi kaydet, token'ları temizle
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      message: 'Şifreniz başarıyla güncellendi! Giriş yapabilirsiniz.',
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Google OAuth2 ile giriş / kayıt
// @route   POST /api/auth/google-login
// @access  Public
// Frontend: useGoogleLogin (access_token flow) → Google UserInfo → bu endpoint
// ──────────────────────────────────────────────────────────────────────────────
export const googleLogin = async (req, res, next) => {
  try {
    const { accessToken, userInfo, termsAccepted, privacyNoticeAcknowledged } = req.body;

    if (!accessToken || !userInfo) {
      res.status(400);
      throw new Error('Google token veya kullanıcı bilgisi eksik');
    }

    // Google access_token'ı doğrula: token'ı Google'ın tokeninfo endpoint'ine gönder
    const tokenInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
    );
    const tokenInfo = await tokenInfoRes.json();

    if (tokenInfo.error) {
      res.status(401);
      throw new Error('Geçersiz Google token');
    }

    // userInfo'dan güvenli şekilde bilgileri al
    const { email, name, sub: googleId } = userInfo;

    if (!email) {
      res.status(400);
      throw new Error('Google hesabından e-posta alınamadı');
    }

    // Veritabanında bu e-posta var mı?
    let user = await User.findOne({ email });

    if (user) {
      // Google, e-posta adresinin sahibini kendi OAuth akışında doğruladığı
      // için bekleyen e-posta kaydı aynı Google hesabıyla girerse güvenle
      // etkinleştirilebilir. Böylece kullanıcı ayrı bir kod girmek zorunda
      // kalmaz; başka biri ise bu adımı geçemez.
      if (user.isEmailVerified === false) {
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        user.emailVerificationLastSentAt = undefined;
        user.pendingAccountExpiresAt = undefined;
        await user.save({ validateBeforeSave: false });
      }

      // İlk Google kaydında e-posta gönderilemediyse sonraki güvenli Google
      // girişinde tekrar deneriz. Bu çağrı gönderim isteğini tamamlar; daha
      // önce arka plana bırakılması bazı cihazlarda hoş geldin e-postasının
      // hiç gönderilmemesine yol açabiliyordu.
      if (!user.usernameOnboardingRequired) {
        await sendWelcomeEmailIfNeeded(user);
      }

      // ── Mevcut kullanıcı: direkt JWT ver
      return res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        usernameOnboardingRequired: Boolean(user.usernameOnboardingRequired),
        token: generateToken(user._id),
      });
    }

    // Google ile ilk kayıt da e-posta kaydıyla aynı yasal onaydan geçer.
    // Mevcut hesapların girişini etkilemez.
    if (termsAccepted !== true || privacyNoticeAcknowledged !== true) {
      res.status(400);
      throw new Error('Yeni hesap oluşturmak için Kullanıcı Sözleşmesi kabulü ve KVKK Aydınlatma Metni bilgilendirmesi zorunludur.');
    }

    // ── Yeni kullanıcı: sistem için geçici, görünmeyen benzersiz ad üret.
    // Google adını dönüştürmüyoruz; Türkçe karakterlerin "_" olması sorunu
    // böylece tamamen ortadan kalkıyor. Kullanıcı devam etmeden kendi adını seçer.
    let username;
    do {
      username = `google_${randomBytes(4).toString('hex')}`;
    } while (await User.exists({ username }));

    // Google ile kayıt olan kullanıcılar için rastgele güçlü şifre
    // (kullanıcı bu şifreyi bilmez; giriş sadece Google ile yapılır)
    const uid = googleId || Math.random().toString(36).slice(2, 10);
    const randomPassword = `Gx${uid.slice(0, 8)}!${Math.random().toString(36).slice(2, 8)}Aa1`;

    user = await User.create({
      name: name || username,
      username,
      email,
      password: randomPassword,
      role: 'Host',
      usernameOnboardingRequired: true,
      isEmailVerified: true,
      legalConsent: {
        termsAcceptedAt: new Date(),
        kvkkAcknowledgedAt: new Date(),
        version: LEGAL_CONSENT_VERSION,
      },
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      usernameOnboardingRequired: true,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};
