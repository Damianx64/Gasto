export const DEFAULT_WALLET_COLOR = '#969D83';

const HEX_COLOR_PATTERN = /^#[\dA-F]{6}$/i;

export function normalizeWalletColor(color: string | null) {
  if (!color || color.toUpperCase() === DEFAULT_WALLET_COLOR) return null;
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error('El color de la billetera no es válido.');
  }

  return color.toUpperCase();
}

export function isWalletColorLight(color: string) {
  if (!HEX_COLOR_PATTERN.test(color)) return false;

  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 160;
}

export function darkenWalletColor(color: string, amount = 0.28) {
  const normalizedColor = HEX_COLOR_PATTERN.test(color) ? color : DEFAULT_WALLET_COLOR;
  const factor = 1 - Math.min(1, Math.max(0, amount));

  const darkenedChannels = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(normalizedColor.slice(start, start + 2), 16);
    return Math.round(channel * factor).toString(16).padStart(2, '0');
  });

  return `#${darkenedChannels.join('')}`.toUpperCase();
}
