import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { router, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

function TabIcon({
  android,
  color,
  ios,
  size,
}: {
  android: AndroidSymbol;
  color: ColorValue;
  ios: SFSymbol;
  size: number;
}) {
  return (
    <SymbolView
      name={{ android, ios, web: android }}
      size={size}
      tintColor={color}
    />
  );
}

export default function MainTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#208AEF',
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundSelected,
          paddingTop: 7,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              android={focused ? 'home_filled' : 'home'}
              color={color}
              ios={focused ? 'house.fill' : 'house'}
              size={size}
            />
          ),
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon android="swap_horiz" color={color} ios="arrow.left.arrow.right" size={size} />
          ),
          title: 'Movimientos',
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          tabBarButton: () => (
            <Pressable
              accessibilityLabel="Crear movimiento"
              accessibilityRole="button"
              onPress={() => router.push('/transaction/new')}
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          ),
          title: '',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              android="bar_chart"
              color={color}
              ios={focused ? 'chart.bar.fill' : 'chart.bar'}
              size={size}
            />
          ),
          title: 'Reportes',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              android="settings"
              color={color}
              ios={focused ? 'gearshape.fill' : 'gearshape'}
              size={size}
            />
          ),
          title: 'Ajustes',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#208AEF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginTop: -20,
    width: 56,
  },
  addButtonPressed: {
    opacity: 0.75,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 34,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
