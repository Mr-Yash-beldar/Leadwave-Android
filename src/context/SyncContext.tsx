import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

const SyncContext = createContext({
    isSyncing: false,
    setSyncing: (val: boolean) => {}
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSyncing, setSyncing] = useState(false);

    return (
        <SyncContext.Provider value={{ isSyncing, setSyncing }}>
            {children}
            {isSyncing && (
                <View style={styles.indicatorContainer}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.text}>Syncing call logs...</Text>
                </View>
            )}
        </SyncContext.Provider>
    );
};

const styles = StyleSheet.create({
    indicatorContainer: {
        position: 'absolute',
        top: 0, // Or bottom, or specific location. Top of screen (safe area?)
        right: 0,
        left: 0,
        backgroundColor: colors.primary,
        padding: 4,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
    },
    text: {
        color: colors.black,
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 8
    }
});
