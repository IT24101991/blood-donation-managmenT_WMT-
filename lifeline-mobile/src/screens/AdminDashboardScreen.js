import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
    Package, FlaskConical as Flask, Hospital, ShieldCheck, 
    Stethoscope, Heart, CalendarDays, MapPin, 
    Activity, CheckCircle2, AlertTriangle, Clock 
} from 'lucide-react-native';

const ALERT_REFRESH_INTERVAL_MS = 15000;

export default function AdminDashboardScreen({ navigation }) {
    const { canViewInventory, canViewLab, canCreateHospitalRequest, canManageCredentials, logout } = useAuth();
    
    const [recentActivity, setRecentActivity] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);

    const modules = [
        ...(canViewInventory ? [{ title: 'Inventory', route: 'InventoryDashboard', desc: 'Manage blood stock', color: '#E11D48', icon: Package }] : []),
        ...(canViewLab ? [{ title: 'Lab', route: 'LabDashboard', desc: 'Test completed bags', color: '#0EA5E9', icon: Flask }] : []),
        ...(canCreateHospitalRequest ? [{ title: 'Blood Request', route: 'Emergency', desc: 'Hospital fulfillment', color: '#2563EB', icon: Hospital }] : []),
        ...(canManageCredentials ? [{ title: 'Credentials', route: 'Credentials', desc: 'Manage staff', color: '#7C3AED', icon: ShieldCheck }] : []),
        ...(canManageCredentials ? [{ title: 'Hospitals', route: 'Hospitals', desc: 'Hospital data', color: '#0F766E', icon: Stethoscope }] : []),
        { title: 'Donors', route: 'Donors', desc: 'Donate and track impact', color: '#10B981', icon: Heart },
        { title: 'Appointments', route: 'Appointments', desc: 'Manage bookings', color: '#0EA5E9', icon: CalendarDays },
        { title: 'Camps', route: 'Camps', desc: 'Donation events', color: '#F59E0B', icon: MapPin },
    ];

    useEffect(() => {
        const fetchSignals = async () => {
            try {
                const actRes = await api.get('/api/activity/recent');
                setRecentActivity(actRes.data || []);
            } catch (err) { console.warn('Activity fetch fail'); }
            finally { setActivityLoading(false); }

            try {
                const lowRes = await api.get('/api/inventory/low-stock');
                setLowStock(lowRes.data || []);
            } catch (err) { }

            if (canViewInventory) {
                try {
                    const invRes = await api.get('/api/inventory');
                    setInventory(invRes.data || []);
                } catch (err) { }
                finally { setInventoryLoading(false); }
            }
        };

        fetchSignals();
        const intervalId = setInterval(fetchSignals, ALERT_REFRESH_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [canViewInventory]);

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    };

    const emergencyAlerts = useMemo(() => {
        return recentActivity.filter(item => {
            const type = (item.activityType || '').toUpperCase();
            return type.includes('EMERGENCY');
        });
    }, [recentActivity]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.kicker}>Overview</Text>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>LifeLine Control Center</Text>
                </View>
                <View style={{alignItems: 'flex-end', gap: 10}}>
                    <View style={styles.statusBadge}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text style={styles.statusText}>Operational</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={{backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20}}>
                        <Text style={{color: '#DC2626', fontWeight: 'bold', fontSize: 12}}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.grid}>
                {modules.map((mod, idx) => {
                    const Icon = mod.icon;
                    return (
                        <TouchableOpacity 
                            key={idx} 
                            style={styles.card}
                            onPress={() => navigation.navigate(mod.route)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: `${mod.color}15` }]}>
                                <Icon size={24} color={mod.color} />
                            </View>
                            <Text style={styles.cardTitle}>{mod.title}</Text>
                            <Text style={styles.cardDesc} numberOfLines={1}>{mod.desc}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                    <AlertTriangle size={20} color="#FFF" />
                    <Text style={styles.alertTitle}>Critical Alerts</Text>
                </View>
                
                <Text style={styles.alertHuge}>
                    {canViewInventory ? (inventoryLoading ? '...' : lowStock.length) : emergencyAlerts.length}
                </Text>
                
                <Text style={styles.alertSub}>
                    {canViewInventory ? `Critical stock for ${lowStock.length} blood type(s).` : `${emergencyAlerts.length} emergency alerts.`}
                </Text>

                {lowStock.length > 0 && (
                    <View style={styles.lowStockList}>
                        {lowStock.map(item => (
                            <View key={item.bloodType} style={styles.lowStockItem}>
                                <View style={[styles.dot, { backgroundColor: item.units <= 2 ? '#FDA4AF' : '#FDE68A' }]} />
                                <Text style={styles.lowStockText}>
                                    {item.bloodType} runs low ({item.units} left)
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.alertBtn} 
                    onPress={() => navigation.navigate(canViewInventory ? 'InventoryDashboard' : 'Emergency')}
                >
                    <Text style={styles.alertBtnText}>
                        {canViewInventory ? 'View Inventory' : 'View Alerts'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                    <Activity size={20} color="#2563EB" />
                    <Text style={styles.activityTitle}>Recent Activity</Text>
                </View>
                
                {activityLoading ? (
                    <ActivityIndicator color="#2563EB" />
                ) : (
                    recentActivity.slice(0, 5).map(item => (
                        <View key={item.id} style={styles.activityItem}>
                            <Clock size={14} color="#94A3B8" style={{ marginTop: 2 }} />
                            <View style={styles.activityTextCol}>
                                <Text style={styles.activityDesc}>{item.description}</Text>
                                <Text style={styles.activityTime}>{formatTimeAgo(item.timestamp)}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4FF' },
    scroll: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    kicker: { color: '#E11D48', fontWeight: 'bold', fontSize: 13, marginBottom: 4, textTransform: 'uppercase' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    subtitle: { color: '#64748B', fontSize: 14 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    statusText: { color: '#064E3B', fontWeight: '600', fontSize: 12 },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 },
    card: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 4 },
    iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontWeight: 'bold', color: '#1E293B', fontSize: 15, marginBottom: 4 },
    cardDesc: { color: '#64748B', fontSize: 12 },

    alertCard: { backgroundColor: '#E11D48', borderRadius: 20, padding: 20, marginBottom: 24 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    alertHuge: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
    alertSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 16 },
    lowStockList: { marginBottom: 16 },
    lowStockItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    lowStockText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
    alertBtn: { backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    alertBtnText: { color: '#E11D48', fontWeight: 'bold' },

    activityCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    activityTitle: { fontWeight: 'bold', fontSize: 16, color: '#1E293B' },
    activityItem: { flexDirection: 'row', gap: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
    activityTextCol: { flex: 1 },
    activityDesc: { fontSize: 14, color: '#334155', fontWeight: '500', marginBottom: 4 },
    activityTime: { fontSize: 12, color: '#94A3B8', fontWeight: '600' }
});
