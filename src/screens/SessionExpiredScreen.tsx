import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { LogOut, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export const SessionExpiredScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { logout } = useAuth();

    const handleLoginAgain = async () => {
        await logout();
        // RootNavigator handles redirection automatically
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <LogOut size={80} color={colors.primary} />
                </View>

                <Text style={styles.title}>Session Expired</Text>
                <Text style={styles.subtitle}>
                    Your session has ended or is no longer valid. Please log in again to continue managing your leads.
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleLoginAgain}>
                    <RefreshCw size={20} color="#000" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Login Again</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Leadwave Connect</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#FFFDE7', // Very light yellow
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonIcon: {
        marginRight: 10,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    footer: {
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#CCC',
        fontWeight: '600',
        letterSpacing: 1,
    },
});
