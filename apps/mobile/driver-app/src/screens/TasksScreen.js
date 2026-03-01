import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { ScreenWrapper, Card } from '../../../shared/components';
import { colors, spacing, fontSize } from '../../../shared/theme';
import api from '../../../shared/api/client';

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    requestLocation();
    loadTasks();
  }, []);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Enable location access to receive delivery tasks.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
  }

  async function loadTasks() {
    try {
      const data = await api.get('/v1/tasks');
      setTasks(data.tasks || data || []);
    } catch (err) {
      console.log('Failed to load tasks:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleOnline() {
    setOnline(!online);
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
      <View style={styles.header}>
        <View>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={[styles.statusValue, online ? styles.onlineText : styles.offlineText]}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, online ? styles.toggleOnline : styles.toggleOffline]}
          onPress={toggleOnline}
        >
          <Text style={styles.toggleText}>{online ? 'Go Offline' : 'Go Online'}</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapText}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
          <Text style={styles.mapSubtext}>Map view will render here with nearby tasks</Text>
        </View>
      )}

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>{online ? 'Waiting for tasks...' : 'Go online to receive tasks'}</Text>
            <Text style={styles.emptyText}>Delivery tasks will appear here when assigned.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskId}>Task #{item.id}</Text>
              <Text style={styles.taskStatus}>{item.status}</Text>
            </View>
            <Text style={styles.taskAddress}>{item.delivery_address || 'Address pending'}</Text>
            <View style={styles.taskActions}>
              <TouchableOpacity style={styles.acceptBtn}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Text style={styles.navText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusLabel: { fontSize: fontSize.xs, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  statusValue: { fontSize: fontSize.lg, fontWeight: '700' },
  onlineText: { color: colors.success },
  offlineText: { color: colors.muted },
  toggleBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 8 },
  toggleOnline: { backgroundColor: colors.danger + '20', borderWidth: 1, borderColor: colors.danger },
  toggleOffline: { backgroundColor: colors.success, },
  toggleText: { fontWeight: '600', color: colors.text, fontSize: fontSize.sm },
  mapPlaceholder: {
    height: 180, backgroundColor: colors.surface, borderBottomWidth: 1,
    borderBottomColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  mapIcon: { fontSize: 36, marginBottom: spacing.sm },
  mapText: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },
  mapSubtext: { fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.xs },
  list: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
  taskCard: { marginBottom: spacing.md },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  taskId: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  taskStatus: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accent, textTransform: 'uppercase' },
  taskAddress: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.md },
  taskActions: { flexDirection: 'row', gap: spacing.md },
  acceptBtn: { flex: 1, backgroundColor: colors.success, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  acceptText: { color: colors.bg, fontWeight: '600' },
  navBtn: { flex: 1, backgroundColor: colors.accent, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  navText: { color: colors.bg, fontWeight: '600' },
});
