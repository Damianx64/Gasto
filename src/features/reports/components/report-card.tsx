import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { reportPalette } from '@/features/reports/report-theme';

type ReportCardProps = PropsWithChildren<{
  description: string;
  title: string;
  trailing?: ReactNode;
}>;

export function ReportCard({ children, description, title, trailing }: ReportCardProps) {
  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="small" style={styles.description}>
              {description}
            </ThemedText>
          </View>
          {trailing}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    backgroundColor: reportPalette.surface,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#6D6659',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 9,
  },
  card: {
    backgroundColor: reportPalette.surface,
    borderColor: reportPalette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 20,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heading: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  title: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 25,
    fontWeight: '500',
    letterSpacing: -0.35,
    lineHeight: 31,
  },
  description: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  },
});
