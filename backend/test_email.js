import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bitematchinfo@gmail.com',
    pass: 'azcb wgzs vvjy rhlu',
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
