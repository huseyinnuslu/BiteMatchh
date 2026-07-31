import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error('EMAIL_USER ve EMAIL_PASS ortam değişkenleri tanımlı olmalı.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function verify() {
  try {
    await transporter.verify();
    console.log('✅ BİLGİLER DOĞRU, GİRİŞ BAŞARILI!');
  } catch (error) {
    console.error('❌ GİRİŞ BAŞARISIZ:', error.message);
  }
}

verify();
