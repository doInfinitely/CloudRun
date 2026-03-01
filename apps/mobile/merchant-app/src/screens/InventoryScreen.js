import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper, Card, Button } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';
import api from '../../../shared/api/client';

export default function InventoryScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await api.get('/v1/merchant/products');
      setProducts(data.products || data || []);
    } catch (err) {
      console.log('Failed to load products:', err.message);
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
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Button title="+ Add Product" onPress={() => {}} style={styles.addBtn} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No products</Text>
            <Text style={styles.emptyText}>Add your first product to start selling.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.productCard}>
            <View style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>${(item.price_cents / 100).toFixed(2)}</Text>
              </View>
              <View style={[styles.stockBadge, item.stock <= 0 && styles.outOfStock]}>
                <Text style={styles.stockText}>{item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}</Text>
              </View>
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
  addBtn: { marginBottom: spacing.md },
  productCard: { marginBottom: spacing.md },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  productPrice: { fontSize: fontSize.sm, color: colors.accent, marginTop: spacing.xs },
  stockBadge: { backgroundColor: colors.success + '20', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6 },
  outOfStock: { backgroundColor: colors.danger + '20' },
  stockText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.success },
});
