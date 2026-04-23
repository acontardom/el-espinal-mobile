import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import supabase from '../lib/supabase';
import TankSelector from '../components/TankSelector';
import MachineSelector from '../components/MachineSelector';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function CombustibleScreen() {
  const navigation = useNavigation();
  const [tankId, setTankId] = useState<string | null>(null);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [liters, setLiters] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setSuccess('');

    if (!tankId) return setError('Selecciona un estanque.');
    if (!machineId) return setError('Selecciona una máquina.');
    if (!liters.trim() || isNaN(Number(liters)) || Number(liters) <= 0)
      return setError('Ingresa una cantidad de litros válida.');
    if (!date) return setError('Ingresa una fecha.');

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('No hay sesión activa.');
      setLoading(false);
      return;
    }

    const { data: tank } = await supabase
      .from('tanks')
      .select('current_liters')
      .eq('id', tankId)
      .single();

    if (!tank) {
      setError('No se encontró el estanque.');
      setLoading(false);
      return;
    }

    const litersNum = Number(liters);
    const newLiters = tank.current_liters - litersNum;

    if (newLiters < 0) {
      setError(`Stock insuficiente. Disponible: ${tank.current_liters.toLocaleString('es-CL')} L`);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('tank_movements').insert({
      type: 'descarga',
      tank_id: tankId,
      machine_id: machineId,
      movement_date: date,
      liters: litersNum,
      invoice_image_url: null,
      created_by: user.id,
    });

    if (insertError) {
      setError(`Error al guardar: ${insertError.message}`);
      setLoading(false);
      return;
    }

    await supabase.from('tanks').update({ current_liters: newLiters }).eq('id', tankId);

    setLoading(false);
    setSuccess('¡Descarga registrada correctamente!');
    setTimeout(() => navigation.goBack(), 1500);
  }

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Descargar combustible</Text>
          <Text style={styles.pageDesc}>Selecciona el estanque origen, la máquina receptora y los litros a descargar.</Text>

          <SuccessMessage message={success} />
          <ErrorMessage message={error} />

          <TankSelector value={tankId} onChange={(t) => setTankId(t.id)} />

          <MachineSelector
            value={machineId}
            onChange={(m) => setMachineId(m.id)}
            label="Máquina receptora"
          />

          <Text style={styles.label}>Fecha</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#BBB"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Litros</Text>
          <TextInput
            style={styles.input}
            value={liters}
            onChangeText={setLiters}
            placeholder="Ej: 500"
            placeholderTextColor="#BBB"
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginTop: 0, marginBottom: 6 },
  pageDesc: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: '#111',
    backgroundColor: '#FFF',
    marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: '#1A56DB',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
