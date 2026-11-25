// GTI "Work": the reply box's signature toggle signs the message the way
// Ticketz does, with the agent's name in WhatsApp bold on the first line.

export const gtiNameSignature = user => {
  const name = (user?.display_name || user?.name || '').trim();
  return name ? `*${name}:*` : '';
};

export const applyGtiNameSignature = (message, signature) => {
  if (!signature) return message;
  return message ? `${signature}\n${message}` : signature;
};
