// src/screens/ServerDownScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
    ActivityIndicator,
    Platform,
    Animated,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff, ServerCrash, RefreshCw, CloudOff, Wifi, ZapOff } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';

// Connection Status Banner Component
export const ConnectionStatusBanner = () => {
    const { networkInfo, isOffline, isPoorConnection, pendingSyncCount } = useNetwork();
    const [slideAnim] = useState(new Animated.Value(-100));
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const shouldShow = isOffline || isPoorConnection || pendingSyncCount > 0;
        setShowBanner(shouldShow);
    }, [isOffline, isPoorConnection, pendingSyncCount]);

    useEffect(() => {
        if (showBanner) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [showBanner]);

    const getBannerContent = () => {
        if (isOffline) {
            return {
                icon: <CloudOff size={20} color={colors.white} />,
                text: 'You\'re offline - working in offline mode',
                bgColor: colors.error,
                showPending: true
            };
        } else if (isPoorConnection) {
            return {
                icon: <ZapOff size={20} color={colors.white} />,
                text: 'Slow connection detected - using offline mode',
                bgColor: colors.warning,
                showPending: true
            };
        } else if (pendingSyncCount > 0) {
            return {
                icon: <RefreshCw size={20} color={colors.white} />,
                text: `Syncing ${pendingSyncCount} pending ${pendingSyncCount === 1 ? 'item' : 'items'}...`,
                bgColor: colors.info,
                showPending: false
            };
        }
        return null;
    };

    const banner = getBannerContent();
    if (!banner || !showBanner) return null;

    return (
        <Animated.View 
            style={[
                styles.banner,
                { backgroundColor: banner.bgColor, transform: [{ translateY: slideAnim }] }
            ]}
        >
            <View style={styles.bannerContent}>
                <View style={styles.bannerLeft}>
                    {banner.icon}
                    <Text style={styles.bannerText}>{banner.text}</Text>
                </View>
                {banner.showPending && pendingSyncCount > 0 && (
                    <TouchableOpacity 
                        onPress={() => {}}
                        style={styles.bannerButton}
                    >
                        <Text style={styles.bannerButtonText}>
                            {pendingSyncCount} pending
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

// Pending Actions Indicator Component
export const PendingActionsIndicator = () => {
    const { pendingSyncCount, processSyncQueue, isOffline, isPoorConnection } = useNetwork();
    const [scaleAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: pendingSyncCount > 0 ? 1 : 0,
            useNativeDriver: true,
            tension: 50,
            friction: 5,
        }).start();
    }, [pendingSyncCount]);

    if (pendingSyncCount === 0) return null;

    const canSync = !isOffline && !isPoorConnection;

    return (
        <Animated.View style={[styles.pendingIndicator, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity 
                style={[styles.pendingBadge, !canSync && styles.pendingBadgeDisabled]}
                onPress={canSync ? processSyncQueue : undefined}
                disabled={!canSync}
            >
                <RefreshCw size={16} color={colors.white} />
                <Text style={styles.pendingText}>{pendingSyncCount}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Network Quality Indicator Component
export const NetworkQualityIndicator = () => {
    const { networkInfo } = useNetwork();
    const [showTooltip, setShowTooltip] = useState(false);

    if (networkInfo.quality === 'excellent' || networkInfo.quality === 'unknown') {
        return null;
    }

    const getIcon = () => {
        switch (networkInfo.quality) {
            case 'good':
                return <Wifi size={16} color={colors.warning} />;
            case 'poor':
                return <ZapOff size={16} color={colors.warning} />;
            default:
                return null;
        }
    };

    return (
        <TouchableOpacity
            style={styles.qualityIndicator}
            onPress={() => setShowTooltip(true)}
        >
            {getIcon()}
            {showTooltip && (
                <Modal transparent visible={showTooltip} onRequestClose={() => setShowTooltip(false)}>
                    <TouchableOpacity 
                        style={styles.tooltipOverlay}
                        activeOpacity={1}
                        onPress={() => setShowTooltip(false)}
                    >
                        <View style={styles.tooltip}>
                            <Text style={styles.tooltipTitle}>Connection Quality</Text>
                            <Text style={styles.tooltipText}>
                                {networkInfo.quality === 'good' 
                                    ? 'Good connection, but may be slower' 
                                    : 'Poor connection detected. Working in offline mode.'}
                            </Text>
                            {networkInfo.latency !== null && (
                                <Text style={styles.tooltipLatency}>
                                    Latency: {networkInfo.latency}ms
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </TouchableOpacity>
    );
};

// Main ServerDownScreen Component
export const ServerDownScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { networkInfo, checkNow, pendingSyncCount, isOffline, isPoorConnection } = useNetwork();

    const errorType: 'no_internet' | 'server_error' = route.params?.errorType ?? 'no_internet';
    const isNoInternet = errorType === 'no_internet';

    const [retrying, setRetrying] = useState(false);
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (!isNoInternet) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        goToMain();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isNoInternet]);

    useEffect(() => {
        if (!isNoInternet) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
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
            const info = await checkNow();
            if (info.isConnected && info.quality !== 'poor') {
                goToMain();
            }
        } catch (error) {
            console.error('Retry failed:', error);
        } finally {
            setRetrying(false);
        }
    };

    const handleContinueOffline = () => {
        goToMain();
    };

    if (!isNoInternet) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <ServerCrash size={72} color={colors.textSecondary} />
                    <Text style={styles.title}>Server Issue</Text>
                    <Text style={styles.message}>
                        We're having trouble connecting to our servers.
                    </Text>
                    <Text style={styles.countdownText}>
                        Switching to offline mode in {countdown} seconds...
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { marginTop: 20 }]}
                        onPress={goToMain}
                    >
                        <Text style={styles.buttonText}>Go Offline Now</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {isOffline ? (
                    <WifiOff size={72} color={colors.error} />
                ) : isPoorConnection ? (
                    <ZapOff size={72} color={colors.warning} />
                ) : (
                    <WifiOff size={72} color={colors.error} />
                )}
                
                <Text style={styles.title}>
                    {isOffline 
                        ? 'No Internet Connection' 
                        : isPoorConnection 
                        ? 'Slow Connection Detected' 
                        : 'Connection Issue'}
                </Text>
                
                <Text style={styles.message}>
                    {isOffline 
                        ? "You're offline. You can still access previously loaded data."
                        : isPoorConnection
                        ? "Your connection is slow. We'll work in offline mode."
                        : "There seems to be a problem with your connection."}
                </Text>

                {pendingSyncCount > 0 && (
                    <View style={styles.pendingInfo}>
                        <RefreshCw size={16} color={colors.primary} />
                        <Text style={styles.pendingInfoText}>
                            {pendingSyncCount} pending {pendingSyncCount === 1 ? 'change' : 'changes'} to sync
                        </Text>
                    </View>
                )}

                <View style={styles.buttonContainer}>
                    {/* <TouchableOpacity
                        style={[styles.button, styles.offlineButton]}
                        onPress={handleContinueOffline}
                    >
                        <Text style={[styles.buttonText, styles.offlineButtonText]}>
                            Continue Offline
                        </Text>
                    </TouchableOpacity> */}

                    <TouchableOpacity
                        style={[styles.button, retrying && styles.buttonDisabled]}
                        onPress={handleRetry}
                        disabled={retrying}
                    >
                        {retrying ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <Text style={styles.buttonText}>Retry Connection</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.offlineHint}>
                    {isPoorConnection 
                        ? "Working offline until connection improves"
                        : "Your changes will sync automatically when connection returns"}
                </Text>
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
        marginBottom: 24,
        lineHeight: 22,
    },
    countdownText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 16,
    },
    buttonContainer: {
        alignItems: 'center',
        width: '100%',
        gap: 12,
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
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    offlineButton: {
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    offlineButtonText: {
        color: colors.primary,
    },
    offlineHint: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 24,
        fontStyle: 'italic',
    },
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        paddingBottom: 10,
        paddingHorizontal: 16,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    bannerText: {
        color: colors.white,
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
    bannerButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginLeft: 8,
    },
    bannerButtonText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    pendingIndicator: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
    },
    pendingBadge: {
        backgroundColor: colors.primary,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    pendingBadgeDisabled: {
        backgroundColor: colors.textSecondary,
        opacity: 0.7,
    },
    pendingText: {
        color: colors.white,
        marginLeft: 8,
        fontWeight: 'bold',
        fontSize: 14,
    },
    pendingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
    },
    pendingInfoText: {
        color: colors.primary,
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 14,
    },
    qualityIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        right: 20,
        zIndex: 1001,
        padding: 8,
    },
    tooltipOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltip: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 20,
        maxWidth: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    tooltipText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    tooltipLatency: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
    },
});

// ✅ SINGLE EXPORT AT THE BOTTOM ONLY
// Remove any other export statements at the top of components
// The "export" before each component declaration already exports them
// So you DON'T need this separate export block

// If you want a single export block, remove "export" from each component
// and use this block instead. Choose ONE approach, not both.

// Option A: Keep "export" before each component (current setup) - NO separate export block needed
// Option B: Remove "export" from each component and use this block:
/*
export {
    ConnectionStatusBanner,
    PendingActionsIndicator,
    NetworkQualityIndicator,
    ServerDownScreen
};
*/