// App.tsx
import { StatusBar } from 'react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NetworkProvider } from './src/context/NetworkContext';
import { ConnectionStatusBanner, PendingActionsIndicator } from './src/screens/ServerDownScreen';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
 
    
  return ( 
    <NetworkProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="default" />
          <RootNavigator />
          <ConnectionStatusBanner />
          <PendingActionsIndicator />
        </SafeAreaProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}