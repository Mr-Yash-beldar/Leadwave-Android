import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Image 
                source={require('../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: width * 0.6,
        height: width * 0.6,
    },
});
