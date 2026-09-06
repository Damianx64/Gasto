import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ColorValue, LayoutChangeEvent } from 'react-native';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

const ACTIVE_COLOR = '#586744';
const INACTIVE_COLOR = '#62645D';
const INDICATOR_COLOR = '#F3EDE2';
type LiquidTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

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

function LiquidTabBar({ descriptors, navigation, state }: LiquidTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const position = useRef(new Animated.Value(state.index)).current;
  const morph = useRef(new Animated.Value(0)).current;
  const tail = useRef(new Animated.Value(0)).current;
  const previousIndex = useRef(state.index);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const safeBottom = Math.max(insets.bottom, 8);
  const contentWidth = Math.max(barWidth - 2, 0);
  const itemWidth = contentWidth / state.routes.length;
  const activeRoute = state.routes[state.index];
  const indicatorWidth = Math.max(
    itemWidth - (activeRoute?.name === 'transactions' ? 2 : 10),
    0,
  );
  const indicatorLeft = 1 + (itemWidth - indicatorWidth) / 2;

  useEffect(() => {
    const nextIndex = state.index;

    if (nextIndex === previousIndex.current) {
      return;
    }

    setDirection(nextIndex > previousIndex.current ? 1 : -1);
    previousIndex.current = nextIndex;
    animation.current?.stop();
    morph.setValue(0);
    tail.setValue(0);

    animation.current = Animated.parallel([
      Animated.spring(position, {
        damping: 17,
        mass: 0.75,
        stiffness: 165,
        toValue: nextIndex,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(morph, {
          duration: 125,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(morph, {
          duration: 260,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(tail, {
          duration: 90,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(tail, {
          duration: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.current.start();

    return () => animation.current?.stop();
  }, [morph, position, state.index, tail]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const translateX = Animated.multiply(position, itemWidth);
  const scaleX = morph.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });
  const scaleY = morph.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });

  return (
    <View
      onLayout={handleLayout}
      style={[styles.tabBar, { height: 64 + safeBottom, paddingBottom: safeBottom }]}>
      {barWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.liquidIndicator,
            {
              left: indicatorLeft,
              transform: [{ translateX }, { scaleX }, { scaleY }],
              width: indicatorWidth,
            },
          ]}>
          <Animated.View
            style={[
              styles.dropletTail,
              direction === 1 ? styles.dropletTailLeft : styles.dropletTailRight,
              {
                opacity: tail,
                transform: [
                  { rotate: '45deg' },
                  {
                    scale: tail.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      ) : null}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;

        if (route.name === 'new') {
          return (
            <View key={route.key} style={styles.tabItem}>
              <Pressable
                accessibilityLabel="Crear movimiento"
                accessibilityRole="button"
                onPress={() => router.push('/transaction/new')}
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>
          );
        }

        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;

        const onPress = () => {
          const event = navigation.emit({
            canPreventDefault: true,
            target: route.key,
            type: 'tabPress',
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ target: route.key, type: 'tabLongPress' });
        };

        return (
          <Pressable
            accessibilityLabel={options.tabBarAccessibilityLabel}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            key={route.key}
            onLongPress={onLongPress}
            onPress={onPress}
            style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}>
            {options.tabBarIcon?.({ color, focused, size: 24 })}
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={[styles.tabBarLabel, { color }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MainTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
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
      <Tabs.Screen name="new" options={{ title: '' }} />
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
    backgroundColor: ACTIVE_COLOR,
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
    transform: [{ scale: 0.96 }],
  },
  addButtonText: {
    color: '#FFFDF8',
    fontFamily: Fonts.serif,
    fontSize: 40,
    fontWeight: '400',
    lineHeight: 42,
  },
  dropletTail: {
    backgroundColor: INDICATOR_COLOR,
    borderRadius: 5,
    height: 14,
    position: 'absolute',
    top: 17,
    width: 14,
  },
  dropletTailLeft: {
    left: -4,
  },
  dropletTailRight: {
    right: -4,
  },
  liquidIndicator: {
    backgroundColor: INDICATOR_COLOR,
    borderRadius: 24,
    height: 48,
    position: 'absolute',
    top: 7,
  },
  tabBar: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFDF8',
    borderColor: '#E3D9C9',
    borderRadius: 25,
    borderWidth: 1,
    bottom: 8,
    elevation: 8,
    flexDirection: 'row',
    left: 12,
    paddingHorizontal: 0,
    paddingTop: 7,
    position: 'absolute',
    right: 12,
    shadowColor: '#6D6659',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  tabBarLabel: {
    fontFamily: Fonts.serif,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    height: 50,
    justifyContent: 'center',
    zIndex: 1,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
});
