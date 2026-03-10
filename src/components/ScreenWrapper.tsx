// src/components/ScreenWrapper.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';
import { NetworkStatusBar } from './NetworkStatusBar';
import { ConnectionQuality } from './ConnectionQuality';
import { colors } from '../theme/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  navigation: any;
  title: string;
  showBack?: boolean;
  onBackPress?: () => boolean; // Add this for custom back behavior
  rightComponent?: React.ReactNode; // Add this for filter button
}

export const ScreenWrapper = ({
  children,
  navigation,
  title,
  showBack = true,
  onBackPress,
  rightComponent
}: ScreenWrapperProps) => {
  const { isOffline, pendingSyncCount } = useNetwork();

  const handleBackPress = () => {
    if (onBackPress) {
      const shouldPreventDefault = onBackPress();
      if (shouldPreventDefault) return; // Custom behavior, don't navigate
    }
    navigation.goBack(); // Default behavior
  };

  return (
    <View style={styles.container}>
      {/* Header with everything built-in */}
      <View style={styles.header}>
        {showBack && title != "Call Logs" ? (
          <TouchableOpacity onPress={handleBackPress}>
            <ChevronLeft size={28} color={colors.black} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}

        <Text style={styles.headerTitle}>{title}</Text>

        <View style={styles.headerRight}>
          {rightComponent}
          <ConnectionQuality />
        </View>
      </View>

      {/* Network bar always shows automatically */}
      <NetworkStatusBar />

      {/* Optional indicators */}
      {isOffline && (
        <View style={styles.cacheIndicator}>
          <Text style={styles.cacheText}>📱 Offline mode</Text>
        </View>
      )}

      {pendingSyncCount > 0 && (
        <View style={styles.pendingIndicator}>
          <Text style={styles.pendingText}>
            {pendingSyncCount} pending
          </Text>
        </View>
      )}

      {/* Screen content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
    flex: 1, // Allow title to take available space
    textAlign: 'center', // Center the title
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Space between rightComponent and ConnectionQuality
    minWidth: 28, // Maintain layout balance
  },
  content: {
    flex: 1,
  },
  cacheIndicator: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  cacheText: {
    fontSize: 12,
    color: colors.info,
    textAlign: 'center',
  },
  pendingIndicator: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  pendingText: {
    color: colors.black,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});