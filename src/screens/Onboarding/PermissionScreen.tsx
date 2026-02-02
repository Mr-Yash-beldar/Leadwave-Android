import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Phone, Users, CheckCircle, XCircle, Smartphone } from 'lucide-react-native';
// Removed expo-contacts

// Mock CallLog import - in real app would use 'react-native-call-log'
// const CallLog = { requestPermissions: async () => 'granted' }; 

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'granted' | 'denied';
}

export const PermissionScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'call_log',
      title: 'Call Logs',
      description: 'Required to analyze your call history, duration, and patterns.',
      icon: <Phone size={24} color={colors.primary} />,
      status: 'pending',
    },
    {
      id: 'contacts',
      title: 'Contacts',
      description: 'Required to show caller names instead of numbers.',
      icon: <Users size={24} color={colors.primary} />,
      status: 'pending',
    },
    {
      id: 'phone_state',
      title: 'Phone State',
      description: 'Used to detect incoming calls in real-time.',
      icon: <Smartphone size={24} color={colors.primary} />,
      status: 'pending',
    },
  ]);

  const requestPermission = async (id: string) => {
    let status: 'granted' | 'denied' = 'denied';

    try {
      if (Platform.OS === 'android') {
        if (id === 'contacts') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
          status = granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
        } else if (id === 'call_log') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
          status = granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
        } else if (id === 'phone_state') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
          status = granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
        }
      } else {
        // iOS or other platforms simulation
        status = 'granted';
      }

      setPermissions(prev => prev.map(p => 
        p.id === id ? { ...p, status } : p
      ));

    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const allGranted = permissions.every(p => p.status === 'granted');

  const handleContinue = () => {
    if (allGranted) {
      navigation.replace('MainTabs'); 
    } else {
      Alert.alert('Permissions Required', 'Please grant all permissions to proceed.');
    }
  };

  const renderItem = ({ item }: { item: PermissionItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.iconContainer}>{item.icon}</View>
      <View style={styles.textContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDesc}>{item.description}</Text>
      </View>
      <View style={styles.statusContainer}>
        {item.status === 'granted' ? (
          <CheckCircle size={24} color={colors.secondary} />
        ) : item.status === 'denied' ? (
          <XCircle size={24} color={colors.error} />
        ) : (
          <Button 
            title="Allow" 
            onPress={() => requestPermission(item.id)} 
            variant="outline"
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Required Permissions</Text>
        <Text style={styles.subtitle}>
          Grant these permissions to let Callyzer analyze your data.
        </Text>
      </View>

      <FlatList
        data={permissions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <Button 
          title="Continue to App" 
          onPress={handleContinue} 
          disabled={!allGranted}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statusContainer: {
    justifyContent: 'center',
    minWidth: 80,
  },
  footer: {
    padding: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
