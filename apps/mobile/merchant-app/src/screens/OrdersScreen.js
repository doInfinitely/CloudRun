import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper, Card } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';
import api from '../../../shared/api/client';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await api.get('/v1/merchant/orders');
      setOrders(data.orders || data || []);
    } catch (err) {
      console.log('Failed to load orders:', err.message);
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
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Incoming orders will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{item.id}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.orderTotal}>${(item.total_cents / 100).toFixed(2)}</Text>
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn}>
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
  orderCard: { marginBottom: spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  status: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accent, textTransform: 'uppercase' },
  orderTotal: { fontSize: fontSize.lg, fontWeight: '700', color: colors.accent, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  acceptBtn: { flex: 1, backgroundColor: colors.success, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  acceptText: { color: colors.bg, fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: colors.surface2, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.danger },
  rejectText: { color: colors.danger, fontWeight: '600' },
});
