import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from './src/screens/DashboardScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from '../shared/theme';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Dashboard: { focused: 'grid', unfocused: 'grid-outline' },
  Orders: { focused: 'receipt', unfocused: 'receipt-outline' },
  Inventory: { focused: 'cube', unfocused: 'cube-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = tabIcons[route.name];
            return <Ionicons name={focused ? icons.focused : icons.unfocused} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} />
        <Tab.Screen name="Inventory" component={InventoryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
