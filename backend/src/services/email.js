const nodemailer = require('nodemailer');

const PLACEHOLDER_HINTS = ['your-email', 'your-app-password', 'changeme'];

const looksLikePlaceholder = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return true;
  return PLACEHOLDER_HINTS.some((hint) => normalized.includes(hint));
};

const emailPort = () => Number(process.env.EMAIL_PORT || 587);

const isEmailConfigured = () => Boolean(
  process.env.EMAIL_HOST &&
  !looksLikePlaceholder(process.env.EMAIL_USER) &&
  !looksLikePlaceholder(process.env.EMAIL_PASS)
);

let cachedTransporter = null;

// Built lazily so filling in .env only needs a backend restart, and so a
// missing SMTP config never crashes the auth endpoints.
const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const port = emailPort();
  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return cachedTransporter;
};

const appUrl = () => String(process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

const fromAddress = () => {
  const name = process.env.EMAIL_FROM_NAME || 'Novarix';
  return `"${name}" <${process.env.EMAIL_USER}>`;
};

const layout = ({ title, intro, bodyHtml = '', ctaLabel, ctaUrl, footer }) => `
  <div style="margin:0;padding:24px;background:#0b0b12;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#14141f;border:1px solid #262637;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 28px;background:linear-gradient(90deg,#8b5cf6 0%,#ec4899 60%,#f43f5e 100%);">
        <h1 style="margin:0;font-size:20px;color:#ffffff;letter-spacing:-0.3px;">Novarix</h1>
      </div>
      <div style="padding:28px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#f4f4f5;">${title}</h2>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#a1a1aa;">${intro}</p>
        ${bodyHtml}
        ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin:8px 0 4px;padding:12px 22px;background:#8b5cf6;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">${ctaLabel}</a>` : ''}
        ${footer ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#71717a;">${footer}</p>` : ''}
      </div>
    </div>
  </div>
`;

const detailsTable = (rows) => `
  <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#71717a;width:38%;">${label}</td>
        <td style="padding:8px 0;font-size:13px;color:#e4e4e7;font-weight:600;">${value}</td>
      </tr>
    `).join('')}
  </table>
`;

const deliver = async (mailOptions, { label, throwOnError = false }) => {
  const transporter = getTransporter();

  if (!transporter) {
    const message = `Email belum dikonfigurasi. Isi EMAIL_HOST, EMAIL_USER dan EMAIL_PASS (Gmail App Password) di backend/.env untuk mengaktifkan ${label}.`;
    if (throwOnError) throw new Error(message);
    console.warn(`[EMAIL] ${label} dilewati. ${message}`);
    return false;
  }

  try {
    await transporter.sendMail({ from: fromAddress(), ...mailOptions });
    console.log(`[EMAIL] ${label} terkirim ke: ${mailOptions.to}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Gagal mengirim ${label} ke ${mailOptions.to}:`, err.message);
    if (throwOnError) {
      throw new Error(`${label} gagal dikirim. Periksa konfigurasi SMTP Gmail (App Password & port).`);
    }
    return false;
  }
};

const sendConfirmationEmail = async (email, token) => deliver({
  to: email,
  subject: 'Konfirmasi akun Novarix kamu',
  html: layout({
    title: 'Selamat datang di Novarix',
    intro: 'Terima kasih sudah mendaftar. Konfirmasi alamat email kamu untuk mengaktifkan akun.',
    ctaLabel: 'Konfirmasi Email',
    ctaUrl: `${appUrl()}/confirm-email/${token}`,
    footer: 'Jika kamu tidak membuat akun ini, abaikan saja email ini.',
  }),
}, { label: 'email konfirmasi', throwOnError: true });

const sendPasswordResetEmail = async (email, token) => deliver({
  to: email,
  subject: 'Reset password Novarix',
  html: layout({
    title: 'Reset password kamu',
    intro: 'Klik tombol di bawah untuk membuat password baru. Link berlaku selama 1 jam.',
    ctaLabel: 'Reset Password',
    ctaUrl: `${appUrl()}/reset-password/${token}`,
    footer: 'Jika kamu tidak meminta reset password, abaikan email ini dan password kamu tetap aman.',
  }),
}, { label: 'email reset password' });

const PROVIDER_LABELS = {
  password: 'Email / Password',
  google: 'Gmail (Google)',
  yahoo: 'Yahoo',
  apple: 'Apple',
};

/**
 * Login security alert. Best-effort: never blocks or fails the login response.
 */
const sendLoginNotificationEmail = async (email, meta = {}) => {
  if (!email) return false;
  if (String(process.env.EMAIL_NOTIFY_LOGIN || 'true').toLowerCase() === 'false') return false;

  const provider = PROVIDER_LABELS[meta.provider] || meta.provider || PROVIDER_LABELS.password;
  const at = meta.at instanceof Date ? meta.at : new Date();
  const when = at.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: process.env.APP_TIMEZONE || 'Asia/Jakarta' });

  return deliver({
    to: email,
    subject: 'Login baru ke akun Novarix kamu',
    html: layout({
      title: `Hai ${meta.displayName || 'Novarian'}, ada login baru`,
      intro: 'Kami mendeteksi login berhasil ke akun Novarix kamu. Jika ini kamu, tidak perlu melakukan apa pun.',
      bodyHtml: detailsTable([
        ['Metode login', provider],
        ['Waktu', when],
        ['Alamat IP', meta.ip || 'tidak diketahui'],
        ['Perangkat', meta.userAgent || 'tidak diketahui'],
      ]),
      ctaLabel: 'Amankan akun saya',
      ctaUrl: `${appUrl()}/settings`,
      footer: 'Bukan kamu? Segera ganti password Novarix kamu dan aktifkan verifikasi tambahan.',
    }),
  }, { label: 'notifikasi login' });
};

module.exports = {
  sendConfirmationEmail,
  sendPasswordResetEmail,
  sendLoginNotificationEmail,
  isEmailConfigured,
};
