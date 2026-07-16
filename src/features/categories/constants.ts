import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#000000',
] as const;

export const CATEGORY_ICONS = [
  {
    key: 'food',
    label: 'Comida',
    symbol: { android: 'restaurant', ios: 'fork.knife', web: 'restaurant' },
  },
  {
    key: 'transport',
    label: 'Transporte',
    symbol: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' },
  },
  {
    key: 'home',
    label: 'Hogar',
    symbol: { android: 'home', ios: 'house.fill', web: 'home' },
  },
  {
    key: 'health',
    label: 'Salud',
    symbol: { android: 'medical_services', ios: 'cross.case.fill', web: 'medical_services' },
  },
  {
    key: 'salary',
    label: 'Sueldo',
    symbol: { android: 'payments', ios: 'banknote.fill', web: 'payments' },
  },
  {
    key: 'shopping',
    label: 'Compras',
    symbol: { android: 'shopping_bag', ios: 'bag.fill', web: 'shopping_bag' },
  },
  {
    key: 'education',
    label: 'Educación',
    symbol: { android: 'school', ios: 'graduationcap.fill', web: 'school' },
  },
  {
    key: 'entertainment',
    label: 'Entretenimiento',
    symbol: { android: 'movie', ios: 'film.fill', web: 'movie' },
  },
  {
    key: 'work',
    label: 'Trabajo',
    symbol: { android: 'work', ios: 'briefcase.fill', web: 'work' },
  },
  {
    key: 'travel',
    label: 'Viajes',
    symbol: { android: 'flight', ios: 'airplane', web: 'flight' },
  },
  {
    key: 'pets',
    label: 'Mascotas',
    symbol: { android: 'pets', ios: 'pawprint.fill', web: 'pets' },
  },
  {
    key: 'exercise',
    label: 'Ejercicio',
    symbol: { android: 'fitness_center', ios: 'figure.run', web: 'fitness_center' },
  },
  {
    key: 'bills',
    label: 'Servicios',
    symbol: { android: 'receipt_long', ios: 'doc.text.fill', web: 'receipt_long' },
  },
  {
    key: 'gifts',
    label: 'Regalos',
    symbol: { android: 'card_giftcard', ios: 'gift.fill', web: 'card_giftcard' },
  },
  {
    key: 'savings',
    label: 'Ahorro',
    symbol: { android: 'savings', ios: 'dollarsign.circle.fill', web: 'savings' },
  },
  {
    key: 'other',
    label: 'Otro',
    symbol: { android: 'category', ios: 'tag.fill', web: 'category' },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  symbol: { android: AndroidSymbol; ios: SFSymbol; web: AndroidSymbol };
}[];

export type CategoryIconKey = (typeof CATEGORY_ICONS)[number]['key'];

export const DEFAULT_CATEGORY_ICON_KEY: CategoryIconKey = 'other';

export function isCategoryIconKey(
  iconKey?: string | null,
): iconKey is CategoryIconKey {
  return CATEGORY_ICONS.some((option) => option.key === iconKey);
}

export function getCategoryIconOption(iconKey?: string | null) {
  return (
    CATEGORY_ICONS.find((option) => option.key === iconKey) ??
    CATEGORY_ICONS.find((option) => option.key === DEFAULT_CATEGORY_ICON_KEY)!
  );
}
