/*
 * Llama a la API de OpenAI desde el servidor. El API key nunca llega al
 * frontend — vive únicamente en la variable de entorno OPENAI_API_KEY.
 */
class OpenAINotConfiguredError extends Error {
  constructor() {
    super('OPENAI_API_KEY no está configurada en el servidor.');
    this.code = 'OPENAI_NOT_CONFIGURED';
    this.status = 503;
  }
}

async function generateStrategy(prompt) {
  if (!process.env.OPENAI_API_KEY) throw new OpenAINotConfiguredError();

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Eres un estratega senior de marketing digital, contenido y posicionamiento de marca, especializado en negocios pequeños y emprendedores de Latinoamérica. Escribes en español, de forma concreta y accionable, nunca genérica.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 4096,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || 'Error de la API de OpenAI (' + res.status + ')');
    err.status = res.status;
    throw err;
  }
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error('OpenAI no devolvió contenido.');
  return text;
}

module.exports = { generateStrategy, OpenAINotConfiguredError };
