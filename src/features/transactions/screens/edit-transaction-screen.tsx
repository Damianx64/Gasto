import { useLocalSearchParams } from 'expo-router';

import { TransactionEditor } from '../components/transaction-editor';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <TransactionEditor transactionId={id} />;
}
