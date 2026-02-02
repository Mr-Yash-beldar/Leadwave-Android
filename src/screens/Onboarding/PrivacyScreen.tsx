import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { AccordionItem } from '../../components/AccordionItem';
import { ShieldAlert } from 'lucide-react-native';

export const PrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
           <Text style={styles.headerTitle}>Your privacy is important to us</Text>
           <Text style={styles.headerSubtitle}>
             Please take time to review the key points of our <Text style={{color: colors.secondary}}>Privacy Policy</Text> below.
           </Text>
        </View>

        <View style={styles.accordionContainer}>
          <AccordionItem 
            title="Data we process" 
            content="We process your call logs and contacts locally on your device to generate insightful reports. We do not transmit your personal conversations." 
          />
          <AccordionItem 
            title="How we use your data" 
            content="Your data is used solely for creating analytics charts, history views, and contact statistics within the app." 
          />
          <AccordionItem 
            title="Unnecessary permissions? We never ask for it" 
            content="We only request permissions that are absolutely necessary for the app's core functionality." 
          />
           <AccordionItem 
            title="Your number is always confidential" 
            content="We do not share your phone number with any third parties." 
          />
        </View>

        <View style={styles.footerInfo}>
            <View style={styles.secureBadge}>
                <ShieldAlert size={20} color={colors.text} style={{marginRight: 8}}/>
                <Text style={styles.secureText}>
                    By clicking Agree & Continue you agree to our <Text style={{fontWeight: 'bold'}}>Privacy Policy.</Text>
                </Text>
            </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="AGREE & CONTINUE" 
          onPress={() => navigation.navigate('ConnectSim')} 
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
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  accordionContainer: {
    marginBottom: 32,
  },
  footerInfo: {
    backgroundColor: '#EAEAEA',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  secureBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  secureText: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
      lineHeight: 18,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: colors.white,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
