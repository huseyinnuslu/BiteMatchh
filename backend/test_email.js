import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolve4 } from 'node:dns/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error('EMAIL_USER ve EMAIL_PASS ortam değişkenleri tanımlı olmalı.');
}

async function verify() {
  try {
    const [smtpIpv4] = await resolve4('smtp.gmail.com');
    const transporter = nodemailer.createTransport({
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
    await transporter.verify();
    console.log('✅ BİLGİLER DOĞRU, GİRİŞ BAŞARILI!');
  } catch (error) {
    console.error('❌ GİRİŞ BAŞARISIZ:', error.message);
  }
}

verify();
