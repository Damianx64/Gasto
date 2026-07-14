import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export default function MainTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
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
          title: 'Reportes',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
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
    backgroundColor: '#111827',
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
});
