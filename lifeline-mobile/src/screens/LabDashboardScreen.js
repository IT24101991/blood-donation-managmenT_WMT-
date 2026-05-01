import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput 
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, CheckCircle2, AlertTriangle, ShieldAlert, Clock, Search, History, Printer, Save, CheckSquare } from 'lucide-react-native';
import * as Print from 'expo-print';

const PAGE_SIZE = 10;
const FILTER_OPTIONS = ['ALL', 'PENDING', 'SAFE', 'BIO-HAZARD'];

export default function LabDashboardScreen({ navigation }) {
    const { canViewLab, logout } = useAuth();
    
    const [pendingBags, setPendingBags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [batchProcessing, setBatchProcessing] = useState(false);

    // Search & filter
    const [searchText, setSearchText] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    // Batch & Test Forms
    const [selectedBags, setSelectedBags] = useState([]);
    const [activeTestBagId, setActiveTestBagId] = useState(null);
    const [testForm, setTestForm] = useState({ hiv: false, hep: false, malaria: false, reason: '' });
    
    // History
    const [labResultsByBag, setLabResultsByBag] = useState({});
    const [historyLoadingBagId, setHistoryLoadingBagId] = useState(null);
    const [expandedHistory, setExpandedHistory] = useState({});

    const fetchBags = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/inventory');
            setPendingBags((res.data || []).map(b => ({...b, id: b.id || b._id})));
        } catch (err) {
            console.error('Error fetching inventory for lab', err);
            Alert.alert('Network Error', 'Unable to fetch lab batches form system.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBags();
    }, []);

    // Filter computation
    const filteredBags = useMemo(() => {
        // Sort descending by collection date
        const sorted = [...pendingBags].sort((a, b) => {
            const ta = a.collectedAt ? new Date(a.collectedAt).getTime() : 0;
            const tb = b.collectedAt ? new Date(b.collectedAt).getTime() : 0;
            return tb - ta;
        });

        return sorted.filter(bag => {
            if (activeFilter !== 'ALL') {
                const ts = (bag.testStatus || '').toUpperCase();
                const sf = (bag.safetyFlag || '').toUpperCase();
                if (activeFilter === 'PENDING' && ts !== 'PENDING') return false;
                if (activeFilter === 'SAFE' && ts !== 'TESTED_SAFE') return false;
                if (activeFilter === 'BIO-HAZARD' && sf !== 'BIO-HAZARD') return false;
            }
            if (searchText) {
                const s = searchText.toLowerCase();
                const matches = 
                    String(bag.id).includes(s) || 
                    (bag.bloodType || '').toLowerCase().includes(s) || 
                    (bag.donorName || '').toLowerCase().includes(s) ||
                    (bag.testStatus || '').toLowerCase().includes(s);
                if (!matches) return false;
            }
            return true;
        });
    }, [pendingBags, activeFilter, searchText]);

    // Analytics computation
    const analytics = useMemo(() => {
        let pending = 0;
        let safeToday = 0;
        let discarded = 0;

        pendingBags.forEach(bag => {
            const status = (bag.testStatus || '').toUpperCase();
            if (status === 'PENDING') pending++;
            else if (status === 'TESTED_SAFE') safeToday++; 
            if ((bag.safetyFlag || '').toUpperCase() === 'BIO-HAZARD') discarded++;
        });
        return { pending, safeToday, discarded };
    }, [pendingBags]);

    const visibleBagsList = filteredBags.slice(0, visibleCount);

    // --- Lab Test Logic ---
    const resetTestForm = () => setTestForm({ hiv: false, hep: false, malaria: false, reason: '' });
    
    const openTestPanel = (bagId) => { 
        if (activeTestBagId === bagId) {
            setActiveTestBagId(null);
            resetTestForm();
        } else {
            setActiveTestBagId(bagId); 
            resetTestForm(); 
        }
    };

    const fetchLabHistory = async (bagId) => {
        setHistoryLoadingBagId(bagId);
        try {
            const res = await api.get(`/api/inventory/${bagId}/lab-results`);
            setLabResultsByBag(prev => ({ ...prev, [bagId]: res.data || [] }));
        } catch (err) {
            setLabResultsByBag(prev => ({ ...prev, [bagId]: [] }));
        } finally {
            setHistoryLoadingBagId(null);
        }
    };

    const toggleHistory = async (bagId) => {
        const nextExpanded = !expandedHistory[bagId];
        setExpandedHistory(prev => ({ ...prev, [bagId]: nextExpanded }));
        if (nextExpanded && !labResultsByBag[bagId]) await fetchLabHistory(bagId);
    };

    const handleSubmitTestResult = async (bagId) => {
        const hasPositive = testForm.hiv || testForm.hep || testForm.malaria;
        const trimmedReason = testForm.reason.trim();

        if (hasPositive && !trimmedReason) {
            Alert.alert('Reason Required', 'Please provide a reason for positive markers.');
            return;
        }

        setProcessingId(bagId);
        try {
            await api.put(`/api/inventory/${bagId}/test`, {
                hiv: testForm.hiv, hep: testForm.hep, malaria: testForm.malaria, reason: trimmedReason || 'Routine Safe'
            });
            setActiveTestBagId(null);
            Alert.alert('Success', `Blood bag #${bagId} was tested successfully.`);
            fetchBags();
            if (expandedHistory[bagId]) fetchLabHistory(bagId);
        } catch (err) {
            Alert.alert('Error', 'Failed to submit test results.');
        } finally {
            setProcessingId(null);
        }
    };

    const printBagLabel = async (bag) => {
        const expiryDate = bag.collectedAt 
            ? new Date(new Date(bag.collectedAt).getTime() + 42 * 24 * 60 * 60 * 1000).toLocaleDateString() 
            : 'Unknown';
        const collectedDate = bag.collectedAt 
            ? new Date(bag.collectedAt).toLocaleDateString() 
            : 'Unknown';

        const html = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            margin: 0; padding: 20px; color: #000;
                        }
                        .label {
                            border: 2px solid #000; padding: 15px; border-radius: 8px; max-width: 350px;
                            margin: 0 auto;
                        }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; font-weight: bold; font-size: 1.2rem; margin-bottom: 15px; }
                        .bt { font-size: 3rem; font-weight: 900; text-align: center; border: 3px solid #000; border-radius: 8px; display:inline-block; padding: 0 15px; margin: 0 auto; }
                        .center { text-align:center; margin-bottom: 15px; }
                        .grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
                        .box { flex: 1 1 45%; border: 1px solid #000; padding: 5px; border-radius: 4px; }
                        .lbl { font-size: 0.6rem; text-transform: uppercase; font-weight: bold; }
                        .val { font-size: 0.8rem; font-weight: bold; }
                        .barcode { text-align: center; margin-top: 15px; border-top: 2px dashed #000; padding-top: 10px; letter-spacing: 3px; font-family: monospace; font-size: 1.5rem; font-weight: bold; }
                        .b-id { font-size: 0.8rem; margin-top: 5px; }
                        @media print {
                            body { margin: 0; padding: 20px; background: white; }
                            .label { page-break-inside: avoid; page-break-after: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="header">LIFELINE BLOOD BANK</div>
                        <div class="center"><div class="bt">${bag.bloodType}</div></div>
                        <div class="grid">
                            <div class="box"><div class="lbl">Bag ID</div><div class="val">#${bag.id}</div></div>
                            <div class="box"><div class="lbl">Status</div><div class="val">${bag.testStatus}</div></div>
                            <div class="box"><div class="lbl">Collected</div><div class="val">${collectedDate}</div></div>
                            <div class="box"><div class="lbl">Expires</div><div class="val">${expiryDate}</div></div>
                        </div>
                        <div class="box"><div class="lbl">Donor Name</div><div class="val">${bag.donorName || 'Unknown Donor'}</div></div>
                        <div class="barcode">
                            || | ||| | || | |||
                            <div class="b-id">*${bag.id}*</div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        try {
            await Print.printAsync({ html });
        } catch (error) {
            Alert.alert('Printing Error', 'Could not access the physical printer.');
        }
    };

    if (!canViewLab) {
        return (
            <View style={styles.centerContainer}>
                <FlaskConical size={48} color="#DC2626" />
                <Text style={styles.unauthText}>Access Restricted</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={{marginTop: 20}}>
                    <Text style={{color: '#2563EB', fontWeight: 'bold'}}>Return to Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <FlaskConical size={24} color="#1E293B" style={{marginRight: 8}} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pageTitle}>Lab Dashboard</Text>
                        <Text style={styles.subtitle}>Test pending donations and generate layout tags.</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={{backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20}}>
                        <Text style={{color: '#DC2626', fontWeight: 'bold', fontSize: 12}}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* Analytics */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    <View style={[styles.statBox, { borderLeftColor: '#3B82F6' }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}><Clock size={20} color="#3B82F6" /></View>
                        <View>
                            <Text style={[styles.statNum, { color: '#1E3A8A' }]}>{analytics.pending}</Text>
                            <Text style={styles.statLbl}>Pending Tests</Text>
                        </View>
                    </View>

                    <View style={[styles.statBox, { borderLeftColor: '#10B981' }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}><ShieldAlert size={20} color="#10B981" /></View>
                        <View>
                            <Text style={[styles.statNum, { color: '#065F46' }]}>{analytics.safeToday}</Text>
                            <Text style={styles.statLbl}>Tested Safe</Text>
                        </View>
                    </View>

                    <View style={[styles.statBox, { borderLeftColor: '#EF4444' }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}><AlertTriangle size={20} color="#EF4444" /></View>
                        <View>
                            <Text style={[styles.statNum, { color: '#991B1B' }]}>{analytics.discarded}</Text>
                            <Text style={styles.statLbl}>Bio-Hazard</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Filters */}
                <View style={styles.searchWrap}>
                    <Search size={16} color="#94A3B8" />
                    <TextInput 
                        style={styles.searchInp} 
                        placeholder="Search ID, type, donor..." 
                        value={searchText} 
                        onChangeText={t => {setSearchText(t); setVisibleCount(PAGE_SIZE);}} 
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {FILTER_OPTIONS.map(f => (
                        <TouchableOpacity 
                            key={f} 
                            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
                            onPress={() => { setActiveFilter(f); setVisibleCount(PAGE_SIZE); }}
                        >
                            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* View */}
                {loading ? (
                    <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 40 }} />
                ) : filteredBags.length === 0 ? (
                    <Text style={styles.emptyText}>No blood bags match criteria.</Text>
                ) : (
                    <View>
                        {visibleBagsList.map(bag => {
                            const isPending = bag.testStatus === 'PENDING';
                            const isSafe = bag.testStatus === 'TESTED_SAFE';
                            
                            return (
                                <View key={bag.id} style={[
                                    styles.card, 
                                    { borderLeftColor: isPending ? '#3B82F6' : (isSafe ? '#10B981' : '#EF4444'), borderLeftWidth: 4 }
                                ]}>
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={styles.cardTitle} numberOfLines={2}>Bag #{bag.id} • <Text style={{color: '#E11D48'}}>{bag.bloodType}</Text></Text>
                                            <Text style={styles.cardSub} numberOfLines={2}>Donor: {bag.donorName || 'Unknown'} | {bag.collectedAt ? new Date(bag.collectedAt).toLocaleDateString() : 'N/A'}</Text>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: isPending ? '#DBEAFE' : (isSafe ? '#D1FAE5' : '#FEE2E2') }]}>
                                            <Text style={[styles.badgeText, { color: isPending ? '#1E40AF' : (isSafe ? '#065F46' : '#991B1B') }]}>{bag.testStatus}</Text>
                                        </View>
                                    </View>

                                    {/* Actions */}
                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                                        {isPending ? (
                                            <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={() => openTestPanel(bag.id)}>
                                                <FlaskConical size={14} color="#FFF" />
                                                <Text style={[styles.btnText, {color: '#FFF'}]}>Record Results</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => printBagLabel(bag)}>
                                                <Printer size={14} color="#065F46" />
                                                <Text style={[styles.btnText, {color: '#065F46'}]}>Print Label</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity style={[styles.btn, styles.btnGray]} onPress={() => toggleHistory(bag.id)}>
                                            <History size={14} color="#475569" />
                                            <Text style={[styles.btnText, {color: '#475569'}]}>{expandedHistory[bag.id] ? 'Hide' : 'History'}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Expandable Test Panel */}
                                    {activeTestBagId === bag.id && (
                                        <View style={styles.testPanel}>
                                            <Text style={styles.testTitle}>Record Lab Markers</Text>
                                            
                                            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12}}>
                                                {['hiv', 'hep', 'malaria'].map(m => (
                                                    <TouchableOpacity key={m} style={[styles.markerBtn, testForm[m] && styles.markerBtnActive]} onPress={() => setTestForm(p => ({...p, [m]: !p[m]}))}>
                                                        <Text style={[styles.markerTitle, testForm[m] && {color:'#991B1B'}]}>{m.toUpperCase()} Positive</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>

                                            <TextInput
                                                style={styles.reasonInput}
                                                placeholder="Remarks (Required if POSITIVE)"
                                                value={testForm.reason}
                                                onChangeText={t => setTestForm(p => ({...p, reason: t}))}
                                            />

                                            <TouchableOpacity 
                                                style={styles.saveBtn} 
                                                disabled={processingId === bag.id}
                                                onPress={() => handleSubmitTestResult(bag.id)}
                                            >
                                                <Save size={16} color="#FFF" />
                                                <Text style={styles.saveBtnText}>{processingId === bag.id ? 'Saving...' : 'Save Results'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* Expandable History Panel */}
                                    {expandedHistory[bag.id] && (
                                        <View style={styles.historyPanel}>
                                            {historyLoadingBagId === bag.id ? (
                                                <ActivityIndicator size="small" />
                                            ) : (!labResultsByBag[bag.id] || labResultsByBag[bag.id].length === 0) ? (
                                                <Text style={styles.historyEmpty}>No history found</Text>
                                            ) : (
                                                labResultsByBag[bag.id].map(row => (
                                                    <View key={row.id} style={styles.historyRow}>
                                                        <Text style={styles.historyTime}>{row.testedAt ? new Date(row.testedAt).toLocaleString() : ''}</Text>
                                                        <Text style={styles.historyResult}>Result: <Text style={{color: row.overallResult === 'TESTED_SAFE' ? '#065F46' : '#991B1B'}}>{row.overallResult}</Text></Text>
                                                        <Text style={styles.historyMarkers}>HIV: {row.hivPositive?'POS':'NEG'} | HEP: {row.hepPositive?'POS':'NEG'} | MAL: {row.malariaPositive?'POS':'NEG'}</Text>
                                                        {row.reason ? <Text style={styles.historyNote}>Note: {row.reason}</Text> : null}
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Pagination */}
                {visibleCount < filteredBags.length && (
                    <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount(c => c + PAGE_SIZE)}>
                        <Text style={styles.loadMoreText}>Show More ({filteredBags.length - visibleCount} left)</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4FF' },
    header: { backgroundColor: '#FFFFFF', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { color: '#64748B', fontSize: 13, marginTop: 4 },
    
    content: { padding: 20 },
    
    statBox: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, width: 140, flexDirection: 'row', gap: 10, alignItems: 'center', marginRight: 10, borderLeftWidth: 4 },
    statIcon: { padding: 8, borderRadius: 20 },
    statNum: { fontWeight: 'bold', fontSize: 18 },
    statLbl: { fontSize: 10, color: '#64748B' },

    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
    searchInp: { flex: 1, height: 40, marginLeft: 8 },

    filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', marginRight: 8 },
    filterPillActive: { backgroundColor: '#334155', borderColor: '#334155' },
    filterText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
    filterTextActive: { color: '#FFF' },

    emptyText: { textAlign: 'center', color: '#64748B', marginTop: 40 },

    card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
    cardTitle: { fontWeight: 'bold', fontSize: 16, color: '#1E293B', marginBottom: 2 },
    cardSub: { fontSize: 12, color: '#64748B' },
    
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },

    btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, gap: 6 },
    btnBlue: { backgroundColor: '#2563EB' },
    btnGreen: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
    btnGray: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    btnText: { fontWeight: '600', fontSize: 13 },

    testPanel: { marginTop: 16, borderTopWidth: 1, borderColor: '#E2E8F0', paddingTop: 16 },
    testTitle: { fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
    markerBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', minWidth: '30%' },
    markerBtnActive: { borderColor: '#FCA5A5', backgroundColor: '#FEE2E2' },
    markerTitle: { fontSize: 12, fontWeight: '600', color: '#475569' },
    reasonInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, minHeight: 40, marginBottom: 12, backgroundColor: '#FFF' },
    
    saveBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8 },
    saveBtnText: { color: '#FFF', fontWeight: 'bold' },

    historyPanel: { marginTop: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
    historyEmpty: { color: '#64748B', fontSize: 12 },
    historyRow: { borderLeftWidth: 3, borderLeftColor: '#CBD5E1', paddingLeft: 10, marginBottom: 12 },
    historyTime: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
    historyResult: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
    historyMarkers: { fontSize: 11, color: '#64748B', marginTop: 2 },
    historyNote: { fontSize: 11, fontStyle: 'italic', marginTop: 2, color: '#475569' },

    loadMoreBtn: { padding: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, alignItems: 'center', marginTop: 6, marginBottom: 40 },
    loadMoreText: { fontWeight: 'bold', color: '#475569' }
});
