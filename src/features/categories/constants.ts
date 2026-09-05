import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export const CATEGORY_COLORS = [
  '#C65B43',
  '#D88758',
  '#D5A83D',
  '#84c79a',
  '#5C8B82',
  '#497753',
  '#5eb3c2',
  '#3F6D91',
  '#7B668C',
  '#4D5047',
] as const;

const EXPENSE_CATEGORY_ICONS = [
  {
    key: 'food',
    label: 'Comida',
    symbol: { android: 'restaurant', ios: 'fork.knife', web: 'restaurant' },
  },
  {
    key: 'transport',
    label: 'Transporte',
    symbol: { android: 'directions_bus', ios: 'bus.fill', web: 'directions_bus' },
  },
  {
    key: 'vehicle',
    label: 'Vehículo',
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
    key: 'groceries',
    label: 'Supermercado',
    symbol: { android: 'shopping_cart', ios: 'cart.fill', web: 'shopping_cart' },
  },
  {
    key: 'shopping',
    label: 'Compras',
    symbol: { android: 'shopping_bag', ios: 'bag.fill', web: 'shopping_bag' },
  },
  {
    key: 'clothing',
    label: 'Ropa',
    symbol: { android: 'checkroom', ios: 'tshirt.fill', web: 'checkroom' },
  },
  {
    key: 'education',
    label: 'Educación',
    symbol: { android: 'school', ios: 'graduationcap.fill', web: 'school' },
  },
  {
    key: 'technology',
    label: 'Tecnología',
    symbol: { android: 'devices', ios: 'laptopcomputer', web: 'devices' },
  },
  {
    key: 'entertainment',
    label: 'Ocio',
    symbol: { android: 'movie', ios: 'film.fill', web: 'movie' },
  },
  {
    key: 'hobbies',
    label: 'Hobbies',
    symbol: { android: 'brush', ios: 'paintbrush.fill', web: 'brush' },
  },
  {
    key: 'personal_care',
    label: 'Cuidado personal',
    symbol: { android: 'spa', ios: 'sparkles', web: 'spa' },
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
    key: 'debts',
    label: 'Deudas',
    symbol: { android: 'credit_card', ios: 'creditcard.fill', web: 'credit_card' },
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

const INCOME_CATEGORY_ICONS = [
  {
    key: 'salary',
    label: 'Sueldo',
    symbol: { android: 'payments', ios: 'banknote.fill', web: 'payments' },
  },
  {
    key: 'work',
    label: 'Trabajo',
    symbol: { android: 'work', ios: 'briefcase.fill', web: 'work' },
  },
  {
    key: 'business',
    label: 'Negocio',
    symbol: { android: 'storefront', ios: 'storefront.fill', web: 'storefront' },
  },
  {
    key: 'sales',
    label: 'Ventas',
    symbol: { android: 'sell', ios: 'tag.fill', web: 'sell' },
  },
  {
    key: 'investments',
    label: 'Inversiones',
    symbol: {
      android: 'trending_up',
      ios: 'chart.line.uptrend.xyaxis',
      web: 'trending_up',
    },
  },
  {
    key: 'bonuses',
    label: 'Bonos',
    symbol: { android: 'workspace_premium', ios: 'star.circle.fill', web: 'workspace_premium' },
  },
  {
    key: 'freelance',
    label: 'Freelance',
    symbol: { android: 'laptop_mac', ios: 'laptopcomputer', web: 'laptop_mac' },
  },
  {
    key: 'refunds',
    label: 'Reembolsos',
    symbol: {
      android: 'currency_exchange',
      ios: 'arrow.triangle.2.circlepath.circle.fill',
      web: 'currency_exchange',
    },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  symbol: { android: AndroidSymbol; ios: SFSymbol; web: AndroidSymbol };
}[];

export const CATEGORY_ICONS_BY_TYPE = {
  expense: EXPENSE_CATEGORY_ICONS,
  income: INCOME_CATEGORY_ICONS,
} as const;

export const CATEGORY_ICONS = [
  ...EXPENSE_CATEGORY_ICONS,
  ...INCOME_CATEGORY_ICONS,
] as const;

const LEGACY_CATEGORY_ICONS = [
  {
    key: 'savings',
    label: 'Ahorro',
    symbol: { android: 'savings', ios: 'dollarsign.circle.fill', web: 'savings' },
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

export function isCategoryIconKeyForType(
  iconKey: string | null | undefined,
  type: keyof typeof CATEGORY_ICONS_BY_TYPE,
): iconKey is CategoryIconKey {
  return CATEGORY_ICONS_BY_TYPE[type].some((option) => option.key === iconKey);
}

export function getCategoryIconOption(iconKey?: string | null) {
  return (
    CATEGORY_ICONS.find((option) => option.key === iconKey) ??
    LEGACY_CATEGORY_ICONS.find((option) => option.key === iconKey) ??
    CATEGORY_ICONS.find((option) => option.key === DEFAULT_CATEGORY_ICON_KEY)!
  );
}
