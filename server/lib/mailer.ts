/**
 * Email delivery. Without SMTP configured, messages go to a dev outbox table
 * (and the console in development) — they are NOT delivered, and the system
 * mode says so.
 */
import type { Config } from '../config.ts';
import type { Db } from '../db/index.ts';

export interface Mailer {
  readonly mode: 'smtp' | 'dev-outbox';
  send(to: string, subject: string, text: string): Promise<void>;
}

export function createMailer(config: Config, db: Db): Mailer {
  if (config.modes.email === 'smtp') {
    let transport: import('nodemailer').Transporter | null = null;
    return {
      mode: 'smtp',
      async send(to, subject, text) {
        const nodemailer = await import('nodemailer');
        transport ??= nodemailer.createTransport(config.SMTP_URL!);
        await transport.sendMail({ from: config.MAIL_FROM, to, subject, text });
        await db.query('insert into email_outbox (to_email, subject, body, provider, sent_at) values ($1,$2,$3,$4, now())', [to, subject, '[sent via smtp]', 'smtp']);
      },
    };
  }
  return {
    mode: 'dev-outbox',
    async send(to, subject, text) {
      await db.query('insert into email_outbox (to_email, subject, body, provider) values ($1,$2,$3,$4)', [to, subject, text, 'dev-outbox']);
      if (config.SAJA_ENV === 'development') console.log(`\n[dev-outbox] Not delivered — "${subject}" for ${to}:\n${text}\n`);
    },
  };
}
