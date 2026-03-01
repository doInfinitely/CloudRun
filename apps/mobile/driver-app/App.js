import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TasksScreen from './src/screens/TasksScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors } from '../shared/theme';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Tasks: { focused: 'map', unfocused: 'map-outline' },
  Earnings: { focused: 'wallet', unfocused: 'wallet-outline' },
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
        <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Map / Tasks' }} />
        <Tab.Screen name="Earnings" component={EarningsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
