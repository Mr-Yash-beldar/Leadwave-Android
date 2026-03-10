import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';

// Add navigation to props
export const HomeScreen: React.FC<{ navigation: any; title: string }> = ({ navigation, title }) => {
  return (
    <ScreenWrapper navigation={navigation} title={title}>
      <View style={styles.container}>
        <Text style={styles.text}>{title}</Text>
        <Text style={styles.subtext}>Coming Soon</Text>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtext: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
});