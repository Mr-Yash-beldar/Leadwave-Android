import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { CheckCircle, Shield } from 'lucide-react-native';
import { PhoneIncoming } from 'lucide-react-native'; // Placeholder for Illustration

export const PermissionCallHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const handleAllowAccess = async () => {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      ]);
      
      console.log('Permissions granted:', granted);
      
      // Navigate regardless for onboarding flow, but in real app we might handle rejection
      navigation.navigate('PermissionContacts');
    } catch (err) {
      console.warn(err);
      navigation.navigate('PermissionContacts');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.illustrationContainer}>
           {/* In real app, this would be the Man+Phone illustration */}
           <View style={styles.placeholderImage}>
             <PhoneIncoming size={80} color={colors.primary} />
           </View>
        </View>

        <Text style={styles.title}>ACCESS TO YOUR CALL - HISTORY</Text>

        <Text style={styles.paragraph}>
          Callyzer would like to access your call history. By allowing Callyzer to access your call logs, the app can analyze your data and generate reports and statistics to monitor the results effectively. Call Log access is mandatory for Callyzer, as its primary feature includes generating call reports.
        </Text>

        <Text style={[styles.paragraph, styles.bold]}>
          Callyzer does not upload your call log data to any cloud server without your consent. The data is stored locally on your device.
        </Text>

        <Text style={styles.paragraph}>
          Callyzer reads call logs when running in the background allowing the app to keep the logs even if it is deleted. Also, you can receive real-time reports without opening the app.
        </Text>

        <View style={styles.footerSpacing} />

        <Button 
          title="Allow Access" 
          onPress={handleAllowAccess} 
        />

        <View style={styles.secureContainer}>
            <Shield size={16} color={colors.text} />
            <Text style={styles.secureText}>It is Secure!</Text>
        </View>

        <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    flexGrow: 1,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderImage: {
      width: 150,
      height: 150,
      backgroundColor: '#FFF8E1',
      borderRadius: 75,
      alignItems: 'center',
      justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 16,
    width: '100%',
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  footerSpacing: {
    flex: 1,
  },
  secureContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 8,
  },
  secureText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
      color: colors.text,
  },
  linkContainer: {
      marginTop: 8,
  },
  linkText: {
      textDecorationLine: 'underline',
      color: colors.textSecondary,
      fontSize: 12,
  }
});
