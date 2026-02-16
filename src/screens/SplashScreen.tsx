import React from 'react';
import { View, Image, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <Image
                    source={require('../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.appName}>Leadwave</Text>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                <Text style={styles.loadingText}>Building connection with server...</Text>
            </View>

            <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Made by</Text>
                <Text style={styles.footerBrand}>YSPInfotech</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: width * 0.4,
        height: width * 0.4,
        marginBottom: 20,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 10,
        letterSpacing: 1,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 20,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 30,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    footerBrand: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 4,
    }
});
