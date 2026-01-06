import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
