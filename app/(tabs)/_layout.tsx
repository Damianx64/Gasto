import { Tabs } from 'expo-router';

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
