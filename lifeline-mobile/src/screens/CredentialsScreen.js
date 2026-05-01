import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Trash2, Search, PlusCircle, RefreshCw, ChevronDown } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

const ROLES = ['DONOR', 'HOSPITAL', 'LAB', 'ADMIN'];
const PAGE_SIZE = 10;

export default function CredentialsScreen({ navigation }) {
    const { canManageCredentials } = useAuth();
    
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('HOSPITAL');
    const [creating, setCreating] = useState(false);

    // Search and Pagination
    const [searchText, setSearchText] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [savingId, setSavingId] = useState(null);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/users');
            setStaff(res.data || []);
        } catch (err) {
            console.warn('Unable to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleCreateStaff = async () => {
        if (!name || !email || !password || !role) {
            return Alert.alert('Error', 'Please fill all fields');
        }

        setCreating(true);
        try {
            await api.post('/api/admin/users', { name, email, password, role });
            Alert.alert('Success', 'Staff member created');
            setName('');
            setEmail('');
            setPassword('');
            setRole('HOSPITAL');
            fetchStaff();
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.response?.data || 'Failed to create staff account');
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateRole = async (targetUserId, newRole) => {
        setSavingId(targetUserId);
        try {
            await api.put(`/api/admin/users/${targetUserId}/role`, { role: newRole });
            Alert.alert('Success', 'Role updated successfully');
            fetchStaff();
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || err?.response?.data || 'Failed to update role');
        } finally {
            setSavingId(null);
        }
    };

    const confirmDelete = (id, targetEmail) => {
        Alert.alert('Delete User', `Are you sure you want to deactivate ${targetEmail}?`, [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/api/admin/users/${id}`);
                        fetchStaff();
                    } catch (e) {
                        Alert.alert('Error', 'Unable to delete user');
                    }
                }
            }
        ]);
    };

    const filteredStaff = staff.filter(user => {
        const s = searchText.toLowerCase();
        return (
            (user.name || '').toLowerCase().includes(s) ||
            (user.email || '').toLowerCase().includes(s) ||
            (user.role || '').toLowerCase().includes(s)
        );
    });

    const visibleStaff = filteredStaff.slice(0, visibleCount);

    if (!canManageCredentials) {
        return (
            <View style={styles.centerContainer}>
                <ShieldCheck size={48} color="#DC2626" />
                <Text style={styles.unauthText}>Unauthorized Access</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={{marginTop: 20}}>
                    <Text style={{color: '#7C3AED', fontWeight: 'bold'}}>Return to Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={fetchStaff} style={styles.refreshBtn}>
                        <RefreshCw size={16} color="#7C3AED" />
                        <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.titleRow}>
                    <ShieldCheck size={24} color="#1E293B" style={{marginRight: 8}} />
                    <Text style={styles.pageTitle}>Credentials</Text>
                </View>
                <Text style={styles.subtitle}>Manage internal staff access</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.formCard}>
                    <View style={styles.formHeaderRow}>
                        <PlusCircle size={18} color="#7C3AED" />
                        <Text style={styles.formTitle}>Issue New Credentials</Text>
                    </View>
                    
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="E.g., John Doe" 
                        value={name} 
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="staff@lifeline.com" 
                        value={email} 
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Secret Key" 
                        value={password} 
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Text style={styles.label}>System Role</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={role}
                            onValueChange={(itemValue) => setRole(itemValue)}
                            style={styles.picker}
                        >
                            {ROLES.map(r => (
                                <Picker.Item key={r} label={r} value={r} style={{ fontSize: 15 }} />
                            ))}
                        </Picker>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleCreateStaff} disabled={creating}>
                        {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Authorize User</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.listSection}>
                    <View style={styles.searchContainer}>
                        <Search size={20} color="#94A3B8" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name, email, or role..."
                            value={searchText}
                            onChangeText={text => { setSearchText(text); setVisibleCount(PAGE_SIZE); }}
                        />
                    </View>

                    <Text style={styles.listTitle}>Active Personnels ({filteredStaff.length})</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#7C3AED" style={{marginTop: 20}} />
                    ) : (
                        visibleStaff.map(user => (
                            <View key={user._id || user.id} style={styles.userCard}>
                                <View style={styles.userMainInfo}>
                                    <UserCheck size={20} color="#7C3AED" style={{marginTop: 4, marginRight: 12}} />
                                    <View style={styles.userTextCol}>
                                        <Text style={styles.userName}>{user.name || 'No Name'}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(user._id || user.id, user.email)}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.roleUpdateRow}>
                                    <View style={styles.listPickerContainer}>
                                        <Picker
                                            selectedValue={user.role}
                                            onValueChange={(newRole) => {
                                                setStaff(prev => prev.map(u => (u.id === (user._id || user.id) ? { ...u, role: newRole } : u)));
                                            }}
                                            style={styles.listPicker}
                                        >
                                            {ROLES.map(r => (
                                                <Picker.Item key={r} label={r} value={r} style={{ fontSize: 14 }} />
                                            ))}
                                        </Picker>
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.saveBtn, savingId === (user._id || user.id) && styles.saveBtnDisabled]} 
                                        onPress={() => handleUpdateRole(user._id || user.id, user.role)}
                                        disabled={savingId === (user._id || user.id)}
                                    >
                                        {savingId === (user._id || user.id) ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={styles.saveBtnText}>Save</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}

                    {!loading && filteredStaff.length > visibleCount && (
                        <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount(c => c + PAGE_SIZE)}>
                            <Text style={styles.loadMoreText}>Show More ({filteredStaff.length - visibleCount} remaining)</Text>
                        </TouchableOpacity>
                    )}
                    
                    {!loading && visibleCount > PAGE_SIZE && (
                        <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount(PAGE_SIZE)}>
                            <Text style={styles.loadMoreText}>Show Less</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4FF' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    unauthText: { marginTop: 10, fontSize: 18, fontWeight: 'bold', color: '#1E293B' },

    header: { backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    refreshText: { color: '#7C3AED', fontWeight: 'bold', fontSize: 13 },
    backText: { color: '#64748B', fontWeight: 'bold' },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { color: '#64748B', fontSize: 13 },

    scroll: { padding: 20 },
    
    formCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
    formHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    label: { fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 6, marginTop: 10 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1E293B' },
    
    pickerContainer: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginTop: 4, overflow: 'hidden', justifyContent: 'center' },
    picker: { height: 50, width: '100%', color: '#1E293B' },

    submitBtn: { backgroundColor: '#7C3AED', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
    submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    listSection: { marginBottom: 40 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, marginBottom: 20 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 45, fontSize: 15, color: '#1E293B' },

    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },

    userCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    userMainInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    userTextCol: { flex: 1 },
    userName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    userEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
    
    roleUpdateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    listPickerContainer: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden', justifyContent: 'center', height: 48 },
    listPicker: { height: 48, width: '100%', color: '#1E293B', marginLeft: -8 },
    saveBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 16, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

    delBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
    
    loadMoreBtn: { padding: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, alignItems: 'center', marginTop: 10 },
    loadMoreText: { color: '#64748B', fontWeight: 'bold', fontSize: 14 }
});
