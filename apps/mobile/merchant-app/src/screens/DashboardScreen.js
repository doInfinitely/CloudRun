import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper, Card } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';
import api from '../../../shared/api/client';

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const data = await api.get('/v1/merchant/dashboard');
      setStats(data);
    } catch (err) {
      console.log('Failed to load dashboard:', err.message);
      setStats({ today_orders: 0, today_revenue: 0, pending_orders: 0, total_products: 0 });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ScreenWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>Welcome back</Text>

        <View style={styles.kpiGrid}>
          <KpiCard label="Today's Orders" value={stats.today_orders || 0} />
          <KpiCard label="Revenue" value={`$${((stats.today_revenue || 0) / 100).toFixed(0)}`} />
          <KpiCard label="Pending" value={stats.pending_orders || 0} accent />
          <KpiCard label="Products" value={stats.total_products || 0} />
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.placeholder}>Order activity will appear here as customers place orders.</Text>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <Card style={styles.kpi}>
      <Text style={[styles.kpiValue, accent && { color: colors.warning }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  kpi: { flex: 1, minWidth: '45%', alignItems: 'center' },
  kpiValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.accent },
  kpiLabel: { fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  placeholder: { fontSize: fontSize.sm, color: colors.muted },
});
