export const formatPrice = (value) =>
  typeof value === "number" ? new Intl.NumberFormat("ru-RU").format(value) + " ₽" : "по запросу";

export const sizeLabel = (artwork) => `${artwork.widthCm}×${artwork.heightCm} см`;

export const statusLabel = (status) => (status === "available" ? "в наличии" : status === "sold" ? "продано" : "по запросу");

export const normalizeText = (value) => value.toLowerCase().replaceAll("ё", "е").trim();
