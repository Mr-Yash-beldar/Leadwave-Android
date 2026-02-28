import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    BackHandler, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff, ServerCrash } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export const ServerDownScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();

    // 'no_internet' = no network, 'server_error' = 5xx from backend
    const errorType: 'no_internet' | 'server_error' = route.params?.errorType ?? 'no_internet';
    const isNoInternet = errorType === 'no_internet';

    const [retrying, setRetrying] = useState(false);

    // On server error → immediately redirect to main app (don't block the user)
    useEffect(() => {
        if (!isNoInternet) {
            const timer = setTimeout(() => {
                goToMain();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isNoInternet]);

    const goToMain = () => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: user ? 'MainTabs' : 'Login' }],
            })
        );
    };

    const handleRetry = async () => {
        setRetrying(true);
        try {
            // Check internet by pinging a reliable endpoint
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                signal: controller.signal,
            }).catch(() => null);

            clearTimeout(timeout);

            if (!response) {
                // Still no internet — stay on screen, user sees the same UI
                setRetrying(false);
                return;
            }

            // Internet is back — go to main
            goToMain();
        } catch {
            setRetrying(false);
        }
    };

    // Disable hardware back on no-internet screen so user can't bypass
    useEffect(() => {
        if (!isNoInternet) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, [isNoInternet]);

    // Server error: show brief redirect message
    if (!isNoInternet) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <ServerCrash size={72} color={colors.textSecondary} />
                    <Text style={styles.title}>Server Issue</Text>
                    <Text style={styles.message}>
                        We encountered a server error. Redirecting you to the app...
                    </Text>
                    <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 24 }} />
                </View>
            </SafeAreaView>
        );
    }

    // No internet: show retry UI
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <WifiOff size={72} color={colors.error} />
                <Text style={styles.title}>No Internet Connection</Text>
                <Text style={styles.message}>
                    Please check your internet connection and try again.
                </Text>

                <TouchableOpacity
                    style={[styles.button, retrying && styles.buttonDisabled]}
                    onPress={handleRetry}
                    disabled={retrying}
                >
                    {retrying ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Retry</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 36,
        lineHeight: 22,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10,
        width: '100%',
        maxWidth: 220,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: colors.black,
        fontWeight: 'bold',
        fontSize: 16,
    },
});