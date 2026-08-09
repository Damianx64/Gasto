import { useLocalSearchParams } from 'expo-router';

import { WalletEditor } from '../components/wallet-editor';

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WalletEditor walletId={id} />;
}
