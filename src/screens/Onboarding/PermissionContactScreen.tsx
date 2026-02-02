import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Shield, Users } from 'lucide-react-native';

export const PermissionContactScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const handleAllowContacts = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      console.log('Contacts permission:', granted);
      navigation.navigate('PermissionNotification');
    } catch (err) {
      console.warn(err);
      navigation.navigate('PermissionNotification');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.illustrationContainer}>
           <View style={styles.placeholderImage}>
             <Users size={80} color={colors.primary} />
           </View>
        </View>

        <Text style={styles.title}>ACCESS TO YOUR CONTACTS</Text>

        <Text style={styles.paragraph}>
          Callyzer needs to access your contacts to display respective names and analyse contact call data. Granting contact permission is mandatory as it supports core feature of Callyzer.
        </Text>

        <Text style={styles.paragraph}>
          We assure you that your contacts will not be uploaded to cloud server. We store the data within your device.
        </Text>

        <Text style={styles.paragraph}>
          If the contact is more than 3000, we run the process in background to avoid wait time.
        </Text>

        <View style={styles.footerSpacing} />

        <Button 
          title="Let's do it" 
          onPress={handleAllowContacts} 
        />

        <View style={styles.secureContainer}>
            <Shield size={16} color={colors.text} />
            <Text style={styles.secureText}>We are safe!</Text>
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
      backgroundColor: '#EFf7FF', // Light blue tint
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
