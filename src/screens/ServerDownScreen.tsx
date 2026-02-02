
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors } from '../theme/colors';
// import RNRestart from 'react-native-restart'; // Removed as unavailable
// For bare react native, typically we just ask user to restart or check connection.
// We'll just have a "Retry" button that might try to ping server?
// Or just a simple screen.

export const ServerDownScreen = () => {
    
    const handleRetry = () => {
        // For now, just exit app or let them try to navigate back if we allow it?
        // User said: "dont allow to access leads page"
        // Best is to just exit or do nothing.
        BackHandler.exitApp();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <WifiOff size={80} color={colors.error} />
                <Text style={styles.title}>Server Unavailable</Text>
                <Text style={styles.message}>
                    We are having trouble connecting to the server. 
                    Please check your internet connection or try again later.
                </Text>
                
                <TouchableOpacity style={styles.button} onPress={handleRetry}>
                    <Text style={styles.buttonText}>Exit App</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    buttonText: {
        color: colors.black,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
