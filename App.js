import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService, DEMO_FOLLOWUPS } from './src/services/NotificationService';

export default function App() {
  useEffect(() => {
    // Create notification channel + schedule follow-up reminders on app start
    NotificationService.scheduleAll(DEMO_FOLLOWUPS).catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <RootNavigator />
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
