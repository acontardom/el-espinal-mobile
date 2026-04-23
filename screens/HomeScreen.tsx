import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import supabase from '../lib/supabase';
import { getCumplimiento } from '../lib/horometros';
import CumplimientoCalendario from '../components/CumplimientoCalendario';

type AppStackParams = {
  Home: undefined;
  Horometro: undefined;
  CombustibleMenu: undefined;
  Combustible: undefined;
  CargaEstacion: undefined;
};

interface RecentReport {
  id: string;
  hours_reading: number;
  reported_date: string;
  machines: { name: string; code: string } | { name: string; code: string }[] | null;
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const [fullName, setFullName] = useState('');
  const [reports, setReports] = useState<RecentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportedDates, setReportedDates] = useState<Set<string>>(new Set());
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [cumplimientoExpanded, setCumplimientoExpanded] = useState(false);

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const today = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile) setFullName(profile.full_name);

    const { data: recentReports } = await supabase
      .from('hourly_reports')
      .select('id, hours_reading, reported_date, machines(name, code)')
      .eq('operator_id', user.id)
      .order('reported_date', { ascending: false })
      .limit(5);

    if (recentReports) setReports(recentReports as RecentReport[]);

    const dates = await getCumplimiento();
    setReportedDates(dates);

    setLoadingReports(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handleProfilePress() {
    Alert.alert(fullName || 'Mi perfil', '¿Qué deseas hacer?', [
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9E75" />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Hola, {fullName || '—'}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress} activeOpacity={0.7}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Acciones rápidas */}
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Acciones rápidas</Text>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Horometro')}
          activeOpacity={0.8}
        >
          <View style={styles.actionLeft}>
            <Text style={styles.actionIcon}>⏱</Text>
            <View>
              <Text style={styles.actionTitle}>Registrar horómetro</Text>
              <Text style={styles.actionSub}>Lectura de horas de máquina</Text>
            </View>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('CombustibleMenu')}
          activeOpacity={0.8}
        >
          <View style={styles.actionLeft}>
            <Text style={styles.actionIcon}>⛽</Text>
            <View>
              <Text style={styles.actionTitle}>Cargar o descargar</Text>
              <Text style={styles.actionSub}>Combustible</Text>
            </View>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        {/* Sección: Mis reportes recientes */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setReportsExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Mis reportes recientes</Text>
          <Text style={styles.chevron}>{reportsExpanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        {reportsExpanded && (
          loadingReports ? (
            <ActivityIndicator color="#1D9E75" style={{ marginTop: 12 }} />
          ) : reports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Sin reportes aún</Text>
            </View>
          ) : (
            reports.map((r) => (
              <View key={r.id} style={styles.reportCard}>
                <View style={styles.reportLeft}>
                  <Text style={styles.reportMachine}>
                    {(() => {
                      const m = Array.isArray(r.machines) ? r.machines[0] : r.machines;
                      return m ? `${m.code} — ${m.name}` : 'Máquina desconocida';
                    })()}
                  </Text>
                  <Text style={styles.reportDate}>{formatDate(r.reported_date)}</Text>
                </View>
                <View style={styles.reportRight}>
                  <Text style={styles.reportHours}>{r.hours_reading.toLocaleString('es-CL')}</Text>
                  <Text style={styles.reportHoursLabel}>horas</Text>
                </View>
              </View>
            ))
          )
        )}

        {/* Sección: Cumplimiento */}
        <View style={styles.sectionDivider} />
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setCumplimientoExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Mi cumplimiento — últimos 30 días</Text>
          <Text style={styles.chevron}>{cumplimientoExpanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        {cumplimientoExpanded && (
          <CumplimientoCalendario reportedDates={reportedDates} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#111' },
  date: { fontSize: 14, color: '#888', marginTop: 2 },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: { fontSize: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 14,
    marginBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  actionBtn: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1D9E75',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  actionIcon: { fontSize: 28 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  actionSub: { fontSize: 13, color: '#666', marginTop: 2 },
  actionChevron: { fontSize: 20, color: '#1D9E75', fontWeight: '600' },
  emptyBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#AAA', fontSize: 15 },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportLeft: { flex: 1 },
  reportMachine: { fontSize: 15, fontWeight: '600', color: '#111' },
  reportDate: { fontSize: 13, color: '#888', marginTop: 3 },
  reportRight: { alignItems: 'flex-end' },
  reportHours: { fontSize: 20, fontWeight: '800', color: '#1D9E75' },
  reportHoursLabel: { fontSize: 12, color: '#AAA' },
});
