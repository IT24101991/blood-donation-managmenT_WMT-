import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Home, CalendarPlus, Map as MapIcon, CalendarDays, Package, MonitorDot } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoadingScreen from '../screens/LoadingScreen';
import DonorDashboardScreen from '../screens/DonorDashboardScreen';
import DonorHomeScreen from '../screens/DonorHomeScreen';
import RoleDashboardHomeScreen from '../screens/RoleDashboardHomeScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import CampMapScreen from '../screens/CampMapScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import InventoryDashboardScreen from '../screens/InventoryDashboardScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import LabDashboardScreen from '../screens/LabDashboardScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import EmergencyAlertsScreen from '../screens/EmergencyAlertsScreen';
import CredentialsScreen from '../screens/CredentialsScreen';
import HospitalsScreen from '../screens/HospitalsScreen';

export default function AppNavigator() {
    const { isAuthenticated, loading, isAdmin, user } = useAuth();
    const [authScreen, setAuthScreen] = useState('Login');
    const userRole = user?.role;
    
    // Default fallback based on roles.
    const getInitialRoute = () => {
        if (isAdmin) return 'AdminDashboard';
        if (userRole === 'LAB' || userRole === 'HOSPITAL') return 'Dashboard';
        return 'Dashboard';
    };
    
    const [activeTab, setActiveTab] = useState(getInitialRoute());

    // Update activeTab when user/isAdmin changes to ensure correct redirection after login/logout
    React.useEffect(() => {
        setActiveTab(getInitialRoute());
    }, [isAdmin, userRole]);
    
    const mockAuthNavigation = { navigate: (screen) => setAuthScreen(screen) };
    const mockAppNavigation = { navigate: (screen) => setActiveTab(screen) };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return authScreen === 'Login' 
            ? <LoginScreen navigation={mockAuthNavigation} />
            : <RegisterScreen navigation={mockAuthNavigation} />;
    }

    if (isAuthenticated) {
        // Safe navigation map
        const renderActiveTab = () => {
            switch(activeTab) {
                // Shared & Donors
                case 'Dashboard':
                    if (userRole === 'DONOR' || !userRole) return <DonorHomeScreen navigation={mockAppNavigation} />;
                    return <RoleDashboardHomeScreen navigation={mockAppNavigation} />;
                case 'Book': return <DonorDashboardScreen navigation={mockAppNavigation} portalRoute="Donors" />;
                case 'BookAppointment': return <BookAppointmentScreen navigation={mockAppNavigation} />;
                case 'Camps': return <CampMapScreen navigation={mockAppNavigation} />;
                
                // Admin & Staff
                case 'AdminDashboard': return <AdminDashboardScreen navigation={mockAppNavigation} />;
                case 'InventoryDashboard': return <InventoryDashboardScreen navigation={mockAppNavigation} />;
                case 'Appointments': return <AppointmentsScreen navigation={mockAppNavigation} />;
                case 'LabDashboard': return <LabDashboardScreen navigation={mockAppNavigation} />;
                case 'Emergency': return <EmergencyScreen navigation={mockAppNavigation} />;
                case 'EmergencyAlerts': return <EmergencyAlertsScreen navigation={mockAppNavigation} />;
                case 'Credentials': return <CredentialsScreen navigation={mockAppNavigation} />;
                case 'Hospitals': return <HospitalsScreen navigation={mockAppNavigation} />;
                case 'Donors': return <DonorDashboardScreen navigation={mockAppNavigation} portalRoute="Donors" />;
                
                default:
                    if (isAdmin) return <AdminDashboardScreen navigation={mockAppNavigation} />;
                    if (userRole === 'DONOR' || !userRole) return <DonorHomeScreen navigation={mockAppNavigation} />;
                    return <RoleDashboardHomeScreen navigation={mockAppNavigation} />;
            }
        };

        const isTabActive = (name) => {
            if (userRole === 'LAB') {
                if (name === 'Dashboard') return activeTab === 'Dashboard' || activeTab === 'Camps';
                return activeTab === name;
            }
            if (userRole === 'HOSPITAL') {
                if (name === 'Dashboard') return activeTab === 'Dashboard' || activeTab === 'Camps';
                return activeTab === name;
            }
            if (name === 'Book') {
                return activeTab === 'Book' || activeTab === 'Donors' || activeTab === 'BookAppointment';
            }
            return activeTab === name;
        };

        const TabItem = ({ name, icon: Icon, label }) => (
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab(name)}>
                <Icon size={24} color={isTabActive(name) ? '#E11D48' : '#94A3B8'} />
                <Text style={[styles.tabText, isTabActive(name) && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
        );

        return (
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    {renderActiveTab()}
                </View>
                <View style={styles.tabBar}>
                    {isAdmin ? (
                        <>
                            <TabItem name="AdminDashboard" icon={MonitorDot} label="Control" />
                            <TabItem name="InventoryDashboard" icon={Package} label="Inventory" />
                            <TabItem name="Appointments" icon={CalendarDays} label="Bookings" />
                        </>
                    ) : userRole === 'LAB' ? (
                        <>
                            <TabItem name="Dashboard" icon={Home} label="Home" />
                            <TabItem name="LabDashboard" icon={MonitorDot} label="Lab" />
                            <TabItem name="InventoryDashboard" icon={Package} label="Inventory" />
                        </>
                    ) : userRole === 'HOSPITAL' ? (
                        <>
                            <TabItem name="Dashboard" icon={Home} label="Home" />
                            <TabItem name="Emergency" icon={CalendarPlus} label="Request" />
                            <TabItem name="Appointments" icon={CalendarDays} label="Bookings" />
                        </>
                    ) : (
                        <>
                            <TabItem name="Dashboard" icon={Home} label="Home" />
                            <TabItem name="Book" icon={CalendarPlus} label="Book" />
                            <TabItem name="Camps" icon={MapIcon} label="Camps" />
                        </>
                    )}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        height: 60,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingBottom: 4,
        paddingTop: 8,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
    },
    tabTextActive: {
        color: '#E11D48',
        fontWeight: 'bold',
    }
});
