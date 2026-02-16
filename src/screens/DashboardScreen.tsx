import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BarChart3,
  Users,
  Briefcase,
  Phone,
  ClipboardList, // ← Added this import
} from 'lucide-react-native';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px left + 16px right + 16px gap

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const sections = [
    {
      title: 'My Campaigns',
      subtitle: 'View and manage your active campaigns',
      icon: Briefcase,
      color: colors.primary,
      screen: 'Campaigns',          // Matches your Tab.Screen name="Campaigns"
    },
    {
      title: 'My Leads',
      subtitle: 'Access all your assigned leads',
      icon: Users,
      color: '#10b981',
      screen: 'Leads',              // Matches your Tab.Screen name="Leads"
    },
    {
      title: 'My Reports',
      subtitle: 'Check performance, calls & analytics',
      icon: BarChart3,
      color: '#f59e0b',
      screen: 'Analytics',          // Matches your Tab.Screen name="Analytics"
    },
    {
      title: 'Call Logs',
      subtitle: 'View personal & lead call history',
      icon: Phone,
      color: '#3b82f6',
      screen: 'Call History',       // Matches your Tab.Screen name="Call History"
    },
  ];

  // Group into pairs for 2-column layout
  const pairedSections = [];
  for (let i = 0; i < sections.length; i += 2) {
    pairedSections.push(sections.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pairedSections.map((pair, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {pair.map((section, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={styles.card}
                activeOpacity={0.8}
            onPress={() => {
  console.log(`Tapped: Navigating to "${section.screen}"`);
  
  navigation.navigate('MainTabs', {
    screen: section.screen,  // This is the key fix
  });
}}
              >
                <View style={[styles.iconContainer, { backgroundColor: section.color + '22' }]}>
                  <section.icon size={32} color={section.color} strokeWidth={1.8} />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{section.title}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {section.subtitle}
                  </Text>
                </View>

                <View style={styles.arrowContainer}>
                  <ClipboardList size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  arrowContainer: {
    alignSelf: 'flex-end',
    padding: 4,
  },
});

export default DashboardScreen;