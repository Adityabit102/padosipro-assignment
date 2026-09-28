import nodemailer from 'nodemailer';
import type { Config } from '../config';

export interface Mailer {
  sendOtp(to: string, code: string, ttlMinutes: number): Promise<void>;
}

export function createSmtpMailer(config: Config): Mailer {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });

  return {
    async sendOtp(to, code, ttlMinutes) {
      await transport.sendMail({
        from: config.MAIL_FROM,
        to,
        subject: `${code} is your PadosiPro verification code`,
        text:
          `Your PadosiPro verification code is ${code}.\n\n` +
          `It expires in ${ttlMinutes} minutes and can be used once.\n` +
          `If you did not create a PadosiPro account, you can ignore this email.`,
        html: otpEmailHtml(code, ttlMinutes),
      });
    },
  };
}

function otpEmailHtml(code: string, ttlMinutes: number): string {
  return `<!doctype html>
<html><body style="margin:0;background:#FAFAF7;font-family:Arial,Helvetica,sans-serif;color:#101828">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border:1px solid #D0D5DD;border-radius:16px;padding:32px">
        <tr><td>
          <div style="font-size:20px;font-weight:700;color:#155C49">PadosiPro</div>
          <p style="font-size:16px;margin:24px 0 8px">Verify your email</p>
          <p style="font-size:14px;color:#667085;margin:0 0 24px">Enter this code in the app to finish creating your account.</p>
          <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#E8F8F3;color:#133E35;border-radius:12px;padding:16px;text-align:center">${code}</div>
          <p style="font-size:13px;color:#667085;margin:24px 0 0">The code expires in ${ttlMinutes} minutes and can be used once. If you did not sign up, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
