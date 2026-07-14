import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ReportCardProps = PropsWithChildren<{
  description: string;
  title: string;
  trailing?: ReactNode;
}>;

export function ReportCard({ children, description, title, trailing }: ReportCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
      ]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.four,
    padding: Spacing.three,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  heading: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
