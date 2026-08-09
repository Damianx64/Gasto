export type WalletType = 'cash' | 'debit';

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
};

export type WalletInput = {
  name: string;
  type: WalletType;
};
