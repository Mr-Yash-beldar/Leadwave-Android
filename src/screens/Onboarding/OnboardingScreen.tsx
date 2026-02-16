import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

export const OnboardingScreen = () => {
    const { completeOnboarding } = useAuth();
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step === 0) {
            setStep(1);
        } else {
            completeOnboarding();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {step === 0 ? (
                    <View style={styles.slide}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Welcome to LeadVidya</Text>
                        <Text style={styles.subtitle}>
                            Your complete solution for managing leads and calls efficiently.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.slide}>
                        <Image
                            source={require('../../assets/call-default.png')}
                            style={styles.featureImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Lead Management</Text>
                        <Text style={styles.subtitle}>
                            Track, manage, and follow up with your leads seamlessly.
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    <View style={[styles.indicator, step === 0 && styles.activeIndicator]} />
                    <View style={[styles.indicator, step === 1 && styles.activeIndicator]} />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>
                        {step === 0 ? 'Next' : 'Get Started'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'space-between',
        padding: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slide: {
        alignItems: 'center',
        width: '100%',
    },
    logoImage: {
        width: width * 0.6,
        height: width * 0.6,
        marginBottom: 40,
    },
    featureImage: {
        width: width * 0.8,
        height: width * 0.8,
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    footer: {
        paddingBottom: 20,
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    indicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 5,
    },
    activeIndicator: {
        backgroundColor: colors.primary,
        width: 20,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
});
