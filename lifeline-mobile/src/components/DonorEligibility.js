import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DonorEligibility = ({ onComplete }) => {
    const [answers, setAnswers] = useState({
        age: '',
        weight: '',
        bloodType: '',
        diseases: false,
        medications: false,
        surgery: false,
        travel: false,
        tattoo: false
    });

    const [isEligible, setIsEligible] = useState(null);

    const checkEligibility = () => {
        let valid = true;
        
        // Basic Logic
        const ageNum = parseInt(answers.age, 10) || 0;
        const widthNum = parseInt(answers.weight, 10) || 0;

        if (ageNum < 18 || ageNum > 65) valid = false;
        if (widthNum < 50) valid = false;
        if (answers.diseases || answers.surgery || answers.travel) valid = false;

        setIsEligible(valid);
        onComplete(valid, answers);
    };

    const toggleCheckbox = (key) => {
        setAnswers(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Health Eligibility Check</Text>

            <View style={styles.gridRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={answers.age}
                        onChangeText={(t) => setAnswers(prev => ({...prev, age: t}))}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={answers.weight}
                        onChangeText={(t) => setAnswers(prev => ({...prev, weight: t}))}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Blood Type</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={answers.bloodType}
                            onValueChange={(value) => setAnswers(prev => ({...prev, bloodType: value}))}
                            style={styles.picker}
                            dropdownIconColor="#475569"
                            mode="dropdown"
                        >
                            <Picker.Item label="Select blood type..." value="" />
                            {BLOOD_TYPES.map(type => (
                                <Picker.Item key={type} label={type} value={type} />
                            ))}
                        </Picker>
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Please tap 'Yes' if any apply to you:</Text>

                {[
                    { key: 'diseases', label: 'Diagnosed with HIV or Hepatitis?' },
                    { key: 'medications', label: 'Taking prescribed medications?' },
                    { key: 'surgery', label: 'Had surgery in the last 6 months?' },
                    { key: 'travel', label: 'Traveled to malaria-risk zones?' },
                    { key: 'tattoo', label: 'Tattoo/piercing in last 6 months?' }
                ].map(q => (
                    <TouchableOpacity 
                        key={q.key} 
                        style={styles.checkboxRow}
                        onPress={() => toggleCheckbox(q.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.checkboxLabel}>{q.label}</Text>
                        <View style={[styles.checkbox, answers[q.key] ? styles.checkboxChecked : null]}>
                            {answers[q.key] ? <Text style={styles.checkmark}>✓</Text> : null}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={checkEligibility}>
                <Text style={styles.buttonText}>Check Eligibility</Text>
            </TouchableOpacity>

            {isEligible !== null ? (
                <View style={[styles.resultBox, isEligible ? styles.resultSuccess : styles.resultError]}>
                    <Text style={[styles.resultText, isEligible ? styles.textSuccess : styles.textError]}>
                        {isEligible ? 'You are Eligible to Donate!' : 'You are currently not eligible'}
                    </Text>
                    <Text style={[styles.resultSubtext, isEligible ? styles.textSuccess : styles.textError]}>
                        {isEligible ? 'Proceed to registration to save lives.' : 'Please consult a doctor or try again later.'}
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#1E293B',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    inputGroup: {
        flex: 1,
        marginHorizontal: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#F8FAFC',
        color: '#1E293B'
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    picker: {
        color: '#1E293B',
        height: 54,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardTitle: {
        fontWeight: '600',
        marginBottom: 12,
        color: '#1E293B'
    },
    checkboxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#334155',
        flex: 1,
        paddingRight: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#E11D48',
        borderColor: '#E11D48',
    },
    checkmark: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    button: {
        backgroundColor: '#E11D48',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resultBox: {
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    resultSuccess: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    resultError: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    resultText: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    resultSubtext: {
        fontSize: 14,
    },
    textSuccess: {
        color: '#166534',
    },
    textError: {
        color: '#991B1B',
    }
});

export default DonorEligibility;
