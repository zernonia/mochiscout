import type { Env } from './env'

export interface Email {
  to: string
  subject: string
  html: string
  text: string
}

/** Sends via Resend. Without RESEND_API_KEY (local dev) the email is logged instead. */
export async function sendEmail(env: Env, email: Email) {
  if (!env.RESEND_API_KEY) {
    console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? 'Mochiscout <onboarding@resend.dev>',
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  })
  if (!res.ok) {
    throw new Error(`Resend failed: ${res.status} ${await res.text()}`)
  }
}
