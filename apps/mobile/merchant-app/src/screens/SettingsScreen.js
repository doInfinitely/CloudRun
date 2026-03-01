import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper, Card, Button } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';

export default function SettingsScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <Text style={styles.name}>My Store</Text>
          <Text style={styles.email}>merchant@cloudrun.shop</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Store Settings</Text>
          <MenuItem label="Store Profile" />
          <MenuItem label="Operating Hours" />
          <MenuItem label="Delivery Zones" />
          <MenuItem label="Payment Info" />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <MenuItem label="Notifications" />
          <MenuItem label="Help Center" />
          <MenuItem label="Contact Support" />
        </Card>

        <Button title="Sign Out" variant="outline" style={styles.signOut} onPress={() => {}} />
      </View>
    </ScreenWrapper>
  );
}

function MenuItem({ label }) {
  return (
    <View style={styles.menuItem}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent, alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.md,
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.bg },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
  card: { marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.accent, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: fontSize.lg, color: colors.muted },
  signOut: { marginTop: spacing.md },
});
