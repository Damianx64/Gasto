import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { router, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

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
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: '#F3EDE2',
        tabBarActiveTintColor: '#586744',
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: '#62645D',
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: {
          backgroundColor: '#FFFDF8',
          borderColor: '#E3D9C9',
          borderRadius: 25,
          borderTopWidth: 1,
          borderWidth: 1,
          bottom: 8,
          elevation: 8,
          height: 64 + safeBottom,
          left: 12,
          paddingBottom: safeBottom,
          paddingHorizontal: 5,
          paddingTop: 7,
          position: 'absolute',
          right: 12,
          shadowColor: '#6D6659',
          shadowOffset: { height: 4, width: 0 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
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
          tabBarLabel: ({ color }) => (
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[styles.tabBarLabel, { color }]}>
              Movimientos
            </Text>
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
    backgroundColor: '#586744',
    borderRadius: 31,
    elevation: 5,
    height: 62,
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#465235',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    width: 62,
  },
  addButtonPressed: {
    opacity: 0.75,
  },
  addButtonText: {
    color: '#FFFDF8',
    fontFamily: Fonts.serif,
    fontSize: 40,
    fontWeight: '400',
    lineHeight: 42,
  },
  tabBarItem: {
    borderRadius: 20,
    marginVertical: 2,
    overflow: 'hidden',
  },
  tabBarLabel: {
    fontFamily: Fonts.serif,
    fontSize: 12,
    fontWeight: '500',
  },
});
