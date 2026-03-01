import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ScreenWrapper, Card } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';

export default function EarningsScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>This Week</Text>
          <Text style={styles.totalValue}>$0.00</Text>
          <Text style={styles.totalSub}>0 deliveries completed</Text>
        </Card>

        <View style={styles.breakdownRow}>
          <Card style={styles.breakdownCard}>
            <Text style={styles.breakdownValue}>$0.00</Text>
            <Text style={styles.breakdownLabel}>Today</Text>
          </Card>
          <Card style={styles.breakdownCard}>
            <Text style={styles.breakdownValue}>$0.00</Text>
            <Text style={styles.breakdownLabel}>Tips</Text>
          </Card>
        </View>

        <Card style={styles.historyCard}>
          <Text style={styles.historyTitle}>Earnings History</Text>
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>Complete deliveries to see your earnings here.</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  totalCard: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.md },
  totalLabel: { fontSize: fontSize.sm, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  totalValue: { fontSize: fontSize.hero, fontWeight: '900', color: colors.accent },
  totalSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.sm },
  breakdownRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  breakdownCard: { flex: 1, alignItems: 'center' },
  breakdownValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  breakdownLabel: { fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  historyCard: { marginBottom: spacing.md },
  historyTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  emptyHistory: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
});
