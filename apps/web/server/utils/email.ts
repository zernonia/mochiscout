import type { Env } from './env'

export interface Email {
  to: string
  subject: string
  html: string
  text: string
}

export type EmailProvider = 'cloudflare' | 'resend'

/**
 * Cloudflare Email Service when the EMAIL binding and EMAIL_FROM are set (the sending
 * domain must be onboarded), else Resend when RESEND_API_KEY is set, else none.
 */
export function emailProvider(env: Env): EmailProvider | null {
  if (env.EMAIL && env.EMAIL_FROM) return 'cloudflare'
  if (env.RESEND_API_KEY) return 'resend'
  return null
}

/** Sends one email. Without a provider (local dev) the email is logged instead. */
export async function sendEmail(env: Env, email: Email) {
  const provider = emailProvider(env)
  if (provider === 'cloudflare') {
    try {
      await sendWithCloudflare(env, email)
      return
    }
    catch (error) {
      if (!env.RESEND_API_KEY) throw error
      console.warn('[email] Cloudflare Email Service failed, falling back to Resend:', errorText(error))
    }
  }
  if (provider) {
    await sendWithResend(env, email)
    return
  }
  console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`)
}

async function sendWithCloudflare(env: Env, email: Email) {
  await env.EMAIL!.send({
    from: parseAddress(env.EMAIL_FROM!),
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

async function sendWithResend(env: Env, email: Email) {
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

/** `Name <addr@x.com>` or a bare address, as the Cloudflare binding wants it. */
export function parseAddress(value: string): string | { name: string, email: string } {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (!match) return value.trim()
  const [, name, email] = match
  return name ? { name, email: email!.trim() } : email!.trim()
}

function errorText(error: unknown) {
  const { code, message } = error as { code?: string, message?: string }
  return [code, message].filter(Boolean).join(' ') || String(error)
}
