export type WalletType = 'cash' | 'debit';

export type Wallet = {
  color: string | null;
  id: string;
  name: string;
  sort_order: number;
  type: WalletType;
};

export type WalletInput = {
  color: string | null;
  name: string;
  type: WalletType;
};
