import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SkeletonItem = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.avatar, { opacity }]} />
            <View style={styles.content}>
                <Animated.View style={[styles.name, { opacity }]} />
                <Animated.View style={[styles.number, { opacity }]} />
            </View>
            <View style={styles.meta}>
                <Animated.View style={[styles.time, { opacity }]} />
                <Animated.View style={[styles.duration, { opacity }]} />
            </View>
        </View>
    );
};

export const SkeletonLoader = ({ count = 5 }) => {
    return (
        <View style={styles.list}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonItem key={i} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    list: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E1E9EE',
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        width: '60%',
        height: 14,
        backgroundColor: '#E1E9EE',
        borderRadius: 4,
        marginBottom: 8,
    },
    number: {
        width: '40%',
        height: 10,
        backgroundColor: '#E1E9EE',
        borderRadius: 4,
    },
    meta: {
        alignItems: 'flex-end',
    },
    time: {
        width: 60,
        height: 10,
        backgroundColor: '#E1E9EE',
        borderRadius: 4,
        marginBottom: 6,
    },
    duration: {
        width: 40,
        height: 10,
        backgroundColor: '#E1E9EE',
        borderRadius: 4,
    },
});
