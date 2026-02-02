import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { ArrowLeft, Smartphone, Info } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export const ConnectSimScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if(!name || !email || !password || !phoneNumber) {
        Alert.alert("Missing Fields", "Please fill all fields.");
        return;
    }
    
    setLoading(true);
    try {
        const res = await register({ name, email, password, number: phoneNumber });
        // Assume success if no error thrown
        // Navigate to OTP
        Alert.alert("Code Sent", `Verification code is ${res.code}`, [
            { text: "OK", onPress: () => navigation.navigate('OtpVerification', { signupData: { name, email, password, number: phoneNumber } }) }
        ]);
    } catch (e: any) {
        Alert.alert("Error", e.message || "Signup failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Up</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Info size={20} color={colors.textSecondary} style={{marginTop: 2}} />
          <Text style={styles.infoText}>
            Please create an account to sync your call history and access recordings.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Email Address"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="Mobile Number"
                placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <Button 
          title="SEND CODE" 
          onPress={handleSubmit}
          loading={loading}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Login</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.footerLinks}>
          <TouchableOpacity><Text style={styles.linkText}>Privacy Policy</Text></TouchableOpacity>
        </View>
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
    fontWeight: '500',
    color: colors.text,
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  infoBox: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginRight: 10,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
