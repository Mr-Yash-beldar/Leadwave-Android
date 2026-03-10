// src/components/NetworkStatusBar.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, ZapOff, RefreshCw, CloudOff } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';
import { colors } from '../theme/colors';

interface NetworkStatusBarProps {
  showPendingCount?: boolean;
  onPendingPress?: () => void;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({
  showPendingCount = true,
  onPendingPress,
}) => {
  const { isOffline, isPoorConnection, pendingSyncCount, networkInfo } = useNetwork();

  if (!isOffline && !isPoorConnection && pendingSyncCount === 0) {
    return null;
  }

  const getStatusConfig = () => {
    if (isOffline) {
      return {
        icon: <CloudOff size={18} color="#fff" />,
        text: 'You are offline',
        bgColor: colors.error,
        showPending: true,
      };
    }
    if (isPoorConnection) {
      return {
        icon: <ZapOff size={18} color="#fff" />,
        text: 'Slow connection detected',
        bgColor: colors.warning,
        showPending: true,
      };
    }
    if (pendingSyncCount > 0) {
      return {
        icon: <RefreshCw size={18} color="#fff" />,
        text: `Syncing ${pendingSyncCount} item${pendingSyncCount > 1 ? 's' : ''}`,
        bgColor: colors.info,
        showPending: false,
      };
    }
    return null;
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={styles.content}>
        <View style={styles.leftContent}>
          {config.icon}
          <Text style={styles.text}>{config.text}</Text>
        </View>
        {config.showPending && pendingSyncCount > 0 && showPendingCount && (
          <TouchableOpacity style={styles.pendingBadge} onPress={onPendingPress}>
            <Text style={styles.pendingText}>{pendingSyncCount} pending</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});