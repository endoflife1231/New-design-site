export function buildMessage({ name, contact, message }) {
  return `Привет, Диана!
Меня зовут ${name}.

${message}

Связаться со мной: ${contact}
Спасибо!`;
}

export function telegramLink(text) {
  return `https://t.me/lybitik?text=${encodeURIComponent(text)}`;
}
