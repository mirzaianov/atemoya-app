const resendApiKey = process.env.RESEND_API_KEY;
const authEmailFrom = process.env.AUTH_EMAIL_FROM;

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY is required.');
}

if (!authEmailFrom) {
  throw new Error('AUTH_EMAIL_FROM is required.');
}

interface AuthEmail {
  subject: string;
  text: string;
  to: string;
}

export const sendAuthEmail = async ({ subject, text, to }: AuthEmail) => {
  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: authEmailFrom,
      subject,
      text,
      to: [to],
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Resend auth email failed with status ${response.status}.`);
  }
};
