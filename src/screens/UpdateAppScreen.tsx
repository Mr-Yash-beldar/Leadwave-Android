import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

const UPDATE_URL = 'https://leadvidya.com/download.php';

export const UpdateAppScreen = () => {
    const navigation = useNavigation();

    const handleOpenLink = async () => {
        try {
            await Linking.openURL(UPDATE_URL);
        } catch (e) {
            Alert.alert('Error', 'Could not open the download page. Please visit:\n' + UPDATE_URL);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Update Application</Text>
                <View style={styles.iconBtn} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Download size={48} color={colors.primary} />
                </View>

                <Text style={styles.heading}>New Update Available</Text>
                <Text style={styles.subtitle}>
                    Get the latest version of LeadVidya with new features and bug fixes.
                </Text>

                <TouchableOpacity style={styles.downloadBtn} onPress={handleOpenLink}>
                    <ExternalLink size={20} color={colors.black} style={{ marginRight: 8 }} />
                    <Text style={styles.downloadBtnText}>Download Latest APK</Text>
                </TouchableOpacity>

                <Text style={styles.urlHint}>{UPDATE_URL}</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 12,
        elevation: 2,
    },
    iconBtn: {
        padding: 6,
        width: 36,
    },
    title: {
        flex: 1,
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF9E6',
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    heading: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 36,
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 10,
        marginBottom: 16,
    },
    downloadBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.black,
    },
    urlHint: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
