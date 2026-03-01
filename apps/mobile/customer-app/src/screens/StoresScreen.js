import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper, Card } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';
import api from '../../../shared/api/client';

export default function StoresScreen() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      const data = await api.get('/v1/stores');
      setStores(data.stores || data || []);
    } catch (err) {
      console.log('Failed to load stores:', err.message);
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
        data={stores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>No stores yet</Text>
            <Text style={styles.emptyText}>Stores will appear here once merchants join the platform.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.storeCard}>
            <Text style={styles.storeName}>{item.name}</Text>
            <Text style={styles.storeAddress}>{item.address || 'No address'}</Text>
            <View style={styles.storeFooter}>
              <Text style={styles.productCount}>{item.product_count || 0} products</Text>
              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View Store</Text>
              </TouchableOpacity>
            </View>
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
  storeCard: { marginBottom: spacing.md },
  storeName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  storeAddress: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.md },
  storeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productCount: { fontSize: fontSize.sm, color: colors.muted },
  viewBtn: { backgroundColor: colors.accent, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8 },
  viewBtnText: { color: colors.bg, fontWeight: '600', fontSize: fontSize.sm },
});
