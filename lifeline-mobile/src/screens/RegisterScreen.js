import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, 
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, 
    Platform, ScrollView 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { PROVINCES, getDistrictsByProvince } from '../constants/locationData';

export default function RegisterScreen({ navigation }) {
    const { register } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        bloodType: '',
        province: 'Western Province',
        district: 'Colombo District',
        nearestHospital: ''
    });

    const [availableDistricts, setAvailableDistricts] = useState(getDistrictsByProvince('Western Province'));

    const handleChange = (name, value) => {
        if (name === 'province') {
            const districts = getDistrictsByProvince(value);
            setAvailableDistricts(districts);
            setFormData(prev => ({ ...prev, [name]: value, district: districts[0] || '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!formData.fullName || !formData.email || !formData.password) {
                setError('Please fill out all fields.');
                return;
            }
        }
        setError('');
        setStep(step + 1);
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            await register(formData);
            // AppNavigator will handle switching automatically, but just in case
        } catch (err) {
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Join LifeLine</Text>
                        <View style={styles.stepperContainer}>
                            <View style={[styles.stepDot, step >= 1 ? styles.stepDotActive : null]} />
                            <View style={[styles.stepDot, step >= 2 ? styles.stepDotActive : null]} />
                        </View>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {step === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>Personal Information</Text>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.fullName}
                                    onChangeText={v => handleChange('fullName', v)}
                                    placeholder="John Doe"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.email}
                                    onChangeText={v => handleChange('email', v)}
                                    placeholder="john@example.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.password}
                                    onChangeText={v => handleChange('password', v)}
                                    placeholder="••••••••"
                                    secureTextEntry={true}
                                />
                            </View>

                            <TouchableOpacity style={styles.button} onPress={handleNext}>
                                <Text style={styles.buttonText}>Next: Location Data</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>Final Step: Location</Text>
                            <Text style={styles.subtitle}>We need your location to find nearby hospitals or camps.</Text>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Province</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={formData.province}
                                        onValueChange={v => handleChange('province', v)}
                                        style={styles.picker}
                                    >
                                        {PROVINCES.map(province => (
                                            <Picker.Item key={province} label={province} value={province} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>District</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={formData.district}
                                        onValueChange={v => handleChange('district', v)}
                                        style={styles.picker}
                                    >
                                        {availableDistricts.map(district => (
                                            <Picker.Item key={district} label={district} value={district} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.button, loading ? styles.buttonDisabled : null]}
                                onPress={handleFinalSubmit}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => setStep(1)}>
                                <Text style={[styles.buttonText, {color: '#1E293B'}]}>Back</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4FF',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    header: {
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    stepperContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E2E8F0',
    },
    stepDotActive: {
        backgroundColor: '#E11D48',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 8,
    },
    subtitle: {
        color: '#64748B',
        marginBottom: 20,
        fontSize: 14,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#F8FAFC',
        color: '#1E293B'
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    picker: {
        color: '#1E293B',
        height: 50,
    },
    button: {
        backgroundColor: '#E11D48',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonSecondary: {
        backgroundColor: '#E2E8F0',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#64748B',
    },
    linkText: {
        color: '#E11D48',
        fontWeight: 'bold',
    }
});
