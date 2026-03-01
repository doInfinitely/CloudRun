import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import StoresScreen from './src/screens/StoresScreen';
import CartScreen from './src/screens/CartScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors } from '../shared/theme';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Stores: { focused: 'storefront', unfocused: 'storefront-outline' },
  Cart: { focused: 'cart', unfocused: 'cart-outline' },
  Orders: { focused: 'receipt', unfocused: 'receipt-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
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
        <Tab.Screen name="Stores" component={StoresScreen} options={{ title: 'Browse Stores' }} />
        <Tab.Screen name="Cart" component={CartScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
