import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ScreenWrapper, Card, Button } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';

export default function CartScreen() {
  const [items] = useState([]);

  if (items.length === 0) {
    return (
      <ScreenWrapper style={styles.center}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Browse stores and add products to get started.</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          </Card>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button title="Proceed to Checkout" onPress={() => {}} />
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
  list: { padding: spacing.md },
  itemCard: { marginBottom: spacing.md },
  itemName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemQty: { fontSize: fontSize.sm, color: colors.muted },
  itemPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent },
  footer: { padding: spacing.md },
});
