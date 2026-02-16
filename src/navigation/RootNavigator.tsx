import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CampaignsScreen } from '../screens/CampaignsScreen';
import { LeadsScreen } from '../screens/LeadsScreen';
import { CallAnalyticsScreen } from '../screens/CallAnalyticsScreen';
import { ContactAnalyticsScreen } from '../screens/ContactAnalyticsScreen';
import { LeadDetailsScreen } from '../screens/LeadDetailsScreen';
import { LeadDisposeScreen } from '../screens/LeadDisposeScreen';
import { CallSummaryScreen } from '../screens/CallSummaryScreen';
import { ServerDownScreen } from '../screens/ServerDownScreen';
import { SessionExpiredScreen } from '../screens/SessionExpiredScreen';
import { CampaignLeadsScreen } from '../screens/CampaignLeadsScreen';
import { colors } from '../theme/colors';
import { Phone, Users, BarChart2, Menu, UserPlus, Megaphone } from 'lucide-react-native';

import { PrivacyScreen } from '../screens/Onboarding/PrivacyScreen';
import { ConnectSimScreen } from '../screens/Onboarding/ConnectSimScreen';
import { VerificationScreen } from '../screens/Onboarding/VerificationScreen';
import { PermissionScreen } from '../screens/Onboarding/PermissionScreen';
import { DefaultPhoneScreen } from '../screens/Onboarding/DefaultPhoneScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { PermissionCallHistoryScreen } from '../screens/Onboarding/PermissionCallHistoryScreen';
import { PermissionContactScreen } from '../screens/Onboarding/PermissionContactScreen';
import { PermissionNotificationScreen } from '../screens/Onboarding/PermissionNotificationScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { OtpVerificationScreen } from '../screens/Auth/OtpVerificationScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, Text, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { useAutoSync } from '../hooks/useAutoSync';
import { navigationRef } from '../services/apiClient';
import { CallScreen } from '../screens/CallScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AnalyticsScreen = () => <HomeScreen title="Analytics" />;

// More Screen with Export and Logout
const MoreScreen = () => {
  const { logout, user } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    await logout();
    // The conditional stack in RootContent will automatically switch to Login
    // because user state becomes null. navigation.reset is not needed here.
  };

  const handleExport = () => {
    // Logic to export logs
    // For now show Alert
    Alert.alert("Export", "Call records exported to Downloads/Callyzer_Export.csv");
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA', padding: 20 }}>
      <View style={{ marginBottom: 30, alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{(user?.name || 'U').charAt(0)}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{user?.name}</Text>
        <Text style={{ color: colors.textSecondary }}>{user?.number}</Text>
      </View>

      <TouchableOpacity onPress={handleExport} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ flex: 1, fontSize: 16 }}>Export Call Records</Text>
        <Menu size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFEBEE', borderRadius: 8 }}>
        <Text style={{ flex: 1, fontSize: 16, color: colors.error }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#000', // Yellow background usually has black text
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tab.Screen
        name="Call History"
        component={HistoryScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Phone color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <UserPlus color={color} size={size} />
        }}
      />

      <Tab.Screen
        name="Analytics"
        component={CallAnalyticsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />
        }}
      />

      <Tab.Screen
        name="Campaigns"
        component={CampaignsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} />
        }}
      />

      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  );
};

const RootContent = () => {
  const { user, loading, isFirstLaunch, isServerUp } = useAuth();
  // useAutoSync(); // Removed as per request

  useEffect(() => {
    const checkPendingDispose = async () => {
      try {
        const pendingLeadJson = await AsyncStorage.getItem('pendingDisposeLead');
        if (pendingLeadJson && user && navigationRef.current) {
          const lead = JSON.parse(pendingLeadJson);
          // Navigate to LeadDetails with dispose tab open
          // Resetting stack slightly to ensure back button works reasonably well
          // or just navigate on top. Navigating on top is safer.
          // We need a small delay to ensure navigation is mounted/ready if checking on mount
          setTimeout(() => {
            navigationRef.current?.navigate('LeadDetails', { lead, openDispose: true });
          }, 500);
        }
      } catch (e) {
        console.error("Checking pending dispose failed", e);
      }
    };

    if (user && !loading) {
      checkPendingDispose();
    }
  }, [user, loading]);

  if (loading) {
    return <SplashScreen />;
  }

  if (!isServerUp) {
    return <ServerDownScreen />;
  }


  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        id="RootStack"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        {!user ? (
          <>
            {isFirstLaunch && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="DefaultPhone" component={DefaultPhoneScreen} />
            <Stack.Screen name="Permissions" component={PermissionCallHistoryScreen} />
            <Stack.Screen name="PermissionContacts" component={PermissionContactScreen} />
            <Stack.Screen name="PermissionNotification" component={PermissionNotificationScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="ConnectSim" component={ConnectSimScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="CallAnalytics" component={CallAnalyticsScreen} />
            <Stack.Screen name="CampaignLeads" component={CampaignLeadsScreen} />
            <Stack.Screen name="ContactAnalytics" component={ContactAnalyticsScreen} />
            <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
            <Stack.Screen name="LeadDispose" component={LeadDisposeScreen} />
            <Stack.Screen name="CallSummary" component={CallSummaryScreen} />
            <Stack.Screen
              name="CallScreen"
              component={CallScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </>
        )}
        <Stack.Screen name="ServerDown" component={ServerDownScreen} />
        <Stack.Screen name="SessionExpired" component={SessionExpiredScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
