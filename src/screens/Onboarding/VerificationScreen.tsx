import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { ArrowLeft, Phone, Smartphone, Ban, ChevronRight } from 'lucide-react-native';

const { RoleManagerModule } = NativeModules;

const VerificationOption = ({ icon: Icon, title, description, onPress, isDestructive = false }: any) => (
  <TouchableOpacity style={styles.optionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconContainer}>
      <Icon size={24} color={colors.text} />
    </View>
    <View style={styles.optionContent}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDesc}>{description}</Text>
    </View>
    <ChevronRight size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

export const VerificationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const handleVerify = () => {
    if (RoleManagerModule?.setOnboarded) {
      RoleManagerModule.setOnboarded(true);
    }
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SIM Number</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Choose one of the option to verify your number</Text>

        <VerificationOption 
          icon={(props: any) => <Smartphone {...props} />} // Placeholder for "Verify via Call Log" icon
          title="Verify via Call Log"
          description="App will show few call logs and you need to simply select which call you have dialed using +918767884273."
          onPress={handleVerify}
        />

        <VerificationOption 
          icon={Phone}
          title="Verify via Call"
          description="App will make a dummy call to your number itself."
          onPress={handleVerify}
        />

        <VerificationOption 
          icon={Ban}
          title="Skip Verification"
          description="(Not Recommended) Verification process will be skipped and you would be able to use app. However, you may face issue with reports and upcoming versions."
          onPress={handleVerify}
          isDestructive
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  content: {
    padding: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
