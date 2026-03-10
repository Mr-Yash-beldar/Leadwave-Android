// src/components/ConnectionQuality.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Wifi, WifiOff, ZapOff } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';
import { colors } from '../theme/colors';

export const ConnectionQuality = () => {
  const { networkInfo } = useNetwork();
  const [showTooltip, setShowTooltip] = useState(false);

  const getQualityIcon = () => {
    if (!networkInfo.isConnected) {
      return <WifiOff size={20} color={colors.error} />;
    }
    switch (networkInfo.quality) {
      case 'excellent':
        return <Wifi size={20} color={colors.success} />;
      case 'good':
        return <Wifi size={20} color={colors.warning} />;
      case 'poor':
        return <ZapOff size={20} color={colors.warning} />;
      default:
        return <Wifi size={20} color={colors.textSecondary} />;
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowTooltip(true)}
      >
        {getQualityIcon()}
      </TouchableOpacity>

      <Modal visible={showTooltip} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <View style={styles.tooltip}>
            <Text style={styles.tooltipTitle}>Connection Status</Text>
            <Text style={styles.tooltipText}>
              Status: {!networkInfo.isConnected ? 'Offline' : networkInfo.quality}
            </Text>
            {networkInfo.latency !== null && (
              <Text style={styles.tooltipText}>Latency: {networkInfo.latency}ms</Text>
            )}
            {!networkInfo.isConnected && (
              <Text style={styles.tooltipHint}>Working in offline mode</Text>
            )}
            {networkInfo.quality === 'poor' && (
              <Text style={styles.tooltipHint}>Slow connection - using offline mode</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  tooltipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tooltipHint: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },
});