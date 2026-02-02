import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
const { RoleManagerModule } = NativeModules;

export const DefaultPhoneScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const handleSetDefault = () => {
    if (RoleManagerModule) {
      RoleManagerModule.requestDefaultDialerRole();
    }
    // Proceed to next screen after requesting
    navigation.navigate('Permissions');
  };

  const handleSkip = () => {
    navigation.navigate('Permissions');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          {/* Using the generated illustration */}
          <Image 
            source={require('../../assets/call-default.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Set Default Phone App</Text>
          <Text style={styles.description}>
            By permitting, you accept to initiate calls through Callyzer application dialer when using this application.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            title="Yes, I Agree" 
            onPress={handleSetDefault}
            style={styles.agreeButton}
          />
          <Button 
            title="SKIP" 
            variant="outline"
            onPress={handleSkip}
            style={styles.skipButton}
          />
        </View>

        <TouchableOpacity 
          style={styles.privacyLink}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    width: '100%',
    height: 300,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  agreeButton: {
    flex: 1,
    marginRight: 10,
  },
  skipButton: {
    flex: 1,
    marginLeft: 10,
  },
  privacyLink: {
    marginTop: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
  },
  privacyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
