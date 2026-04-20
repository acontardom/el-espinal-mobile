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
import MachineSelector from '../components/MachineSelector';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function HorometroScreen() {
  const navigation = useNavigation();
  const [machineId, setMachineId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setSuccess('');

    if (!machineId) return setError('Selecciona una máquina.');
    if (!hours.trim() || isNaN(Number(hours))) return setError('Ingresa una lectura válida.');
    if (!date) return setError('Selecciona una fecha.');

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('No hay sesión activa.');
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from('hourly_reports')
      .select('id')
      .eq('machine_id', machineId)
      .eq('operator_id', user.id)
      .eq('reported_date', date)
      .maybeSingle();

    if (existing) {
      setError('Ya registraste esta máquina en la fecha seleccionada.');
      setLoading(false);
      return;
    }

    const payload = {
      machine_id: machineId,
      operator_id: user.id,
      reported_date: date,
      hours_reading: Number(hours),
      notes: notes.trim() || null,
    };
    console.log('[HorometroScreen] insert payload:', JSON.stringify(payload, null, 2));

    const { error: insertError } = await supabase.from('hourly_reports').insert(payload);

    setLoading(false);

    if (insertError) {
      console.error('[HorometroScreen] insert error:', insertError);
      setError(`Error al guardar: ${insertError.message}`);
    } else {
      setSuccess('¡Horómetro registrado correctamente!');
      setTimeout(() => navigation.goBack(), 1500);
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Registrar horómetro</Text>

        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        <MachineSelector
          value={machineId}
          onChange={(m) => setMachineId(m.id)}
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

        <Text style={styles.label}>Lectura horómetro (horas)</Text>
        <TextInput
          style={styles.input}
          value={hours}
          onChangeText={setHours}
          placeholder="Ej: 12540"
          placeholderTextColor="#BBB"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Observaciones, incidencias..."
          placeholderTextColor="#BBB"
          multiline
          numberOfLines={3}
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

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 20,
  },
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
  textArea: { height: 90, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#666' },
});
