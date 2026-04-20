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

type AppStackParams = {
  Home: undefined;
  Horometro: undefined;
  Combustible: undefined;
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

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
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
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hola, {fullName || '—'}</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Acciones rápidas</Text>

      <TouchableOpacity
        style={[styles.actionBtn, styles.actionGreen]}
        onPress={() => navigation.navigate('Horometro')}
        activeOpacity={0.8}
      >
        <Text style={styles.actionIcon}>⏱</Text>
        <View>
          <Text style={styles.actionTitle}>Registrar horómetro</Text>
          <Text style={styles.actionSub}>Lectura de horas de máquina</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.actionBlue]}
        onPress={() => navigation.navigate('Combustible')}
        activeOpacity={0.8}
      >
        <Text style={styles.actionIcon}>⛽</Text>
        <View>
          <Text style={styles.actionTitle}>Registrar combustible</Text>
          <Text style={styles.actionSub}>Carga o descarga de estanque</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Mis reportes recientes</Text>

      {loadingReports ? (
        <ActivityIndicator color="#1D9E75" style={{ marginTop: 20 }} />
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
  date: { fontSize: 14, color: '#888', marginTop: 2, textTransform: 'capitalize' },
  logoutBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: { color: '#E74C3C', fontWeight: '700', fontSize: 14 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#444',
    marginBottom: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    gap: 16,
  },
  actionGreen: {
    backgroundColor: '#1D9E75',
    shadowColor: '#1D9E75',
  },
  actionBlue: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
  },
  actionIcon: { fontSize: 36 },
  actionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  actionSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
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
