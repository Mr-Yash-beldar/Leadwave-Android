import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Bell } from 'lucide-react-native';

export const PermissionNotificationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const handleEnableNotifications = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log('Notification permission:', granted);
      }
      navigation.navigate('Privacy');
    } catch (err) {
      console.warn(err);
      navigation.navigate('Privacy');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.illustrationContainer}>
           <View style={styles.placeholderImage}>
             <Bell size={80} color={colors.primary} />
           </View>
        </View>

        <Text style={styles.title}>"Callyzer" Would Like to Send You Notifications</Text>

        <Text style={styles.paragraph}>
          With Callyzer notifications, you can receive useful alerts and stay informed about new upcoming blogs, ensuring you never miss out on valuable information and insights.
        </Text>

        <View style={styles.footerSpacing} />

        <Button 
          title="Enable Notifications" 
          onPress={handleEnableNotifications} 
        />

        <TouchableOpacity 
            style={styles.linkContainer}
            onPress={handleSkip} 
        >
            <Text style={styles.laterText}>Maybe later</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.linkContainer, {marginTop: 24}]}>
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
    marginTop: 60,
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderImage: {
      width: 150,
      height: 150,
      backgroundColor: '#FFFDE7',
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
    textAlign: 'center', 
    lineHeight: 22,
    marginBottom: 16,
    width: '100%',
  },
  footerSpacing: {
    flex: 1,
  },
  linkContainer: {
      marginTop: 16,
  },
  laterText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
  },
  linkText: {
      textDecorationLine: 'underline',
      color: colors.textSecondary,
      fontSize: 12,
  }
});
