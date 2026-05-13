const MAILPIT_API = 'http://localhost:8025/api/v1';

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string; Name: string }[];
  Created: string;
}

interface MailpitSearchResponse {
  messages: MailpitSummary[];
  total: number;
}

export interface MailpitMessage {
  ID: string;
  Subject: string;
  HTML: string;
  Text: string;
  To: { Address: string; Name: string }[];
  From: { Address: string; Name: string };
}

export async function clearInbox(): Promise<void> {
  await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' });
}

export async function waitForEmailTo(
  to: string,
  options: { subject?: RegExp; timeout?: number; since?: Date } = {},
): Promise<MailpitMessage> {
  const { subject, timeout = 5000, since } = options;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${MAILPIT_API}/search?query=${encodeURIComponent(`to:${to}`)}&limit=20`,
      );
      if (res.ok) {
        const data = (await res.json()) as MailpitSearchResponse;
        const match = data.messages.find((m) => {
          if (subject && !subject.test(m.Subject)) return false;
          if (since && new Date(m.Created) <= since) return false;
          return true;
        });
        if (match) {
          const detail = await fetch(`${MAILPIT_API}/message/${match.ID}`);
          if (!detail.ok) continue;
          return (await detail.json()) as MailpitMessage;
        }
      }
    } catch {
      // transient network error — retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(
    `Timeout (${timeout}ms) waiting for email to "${to}"` +
      (subject ? ` matching subject ${subject}` : ''),
  );
}
