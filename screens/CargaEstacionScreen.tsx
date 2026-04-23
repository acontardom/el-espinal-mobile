import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import TankSelector from '../components/TankSelector';
import MachineSelector from '../components/MachineSelector';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';
import { uploadFactura, createCargaEstacion } from '../lib/combustible';
import supabase from '../lib/supabase';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function CargaEstacionScreen() {
  const navigation = useNavigation();

  const [date, setDate] = useState(todayISO());

  // Bloque estanque
  const [tankEnabled, setTankEnabled] = useState(false);
  const [tankId, setTankId] = useState<string | null>(null);
  const [tankLiters, setTankLiters] = useState('');

  // Bloque equipo
  const [machineEnabled, setMachineEnabled] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [machineLiters, setMachineLiters] = useState('');

  // Foto
  const [invoiceUri, setInvoiceUri] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Total calculado
  const tankNum = tankEnabled && tankLiters.trim() ? Number(tankLiters) : 0;
  const machineNum = machineEnabled && machineLiters.trim() ? Number(machineLiters) : 0;
  const total = tankNum + machineNum;
  const showTotal = total > 0;

  function showImagePicker() {
    Alert.alert('Foto de factura', 'Selecciona una opción', [
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Elegir de biblioteca', onPress: pickFromLibrary },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setInvoiceUri(result.assets[0].uri);
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setInvoiceUri(result.assets[0].uri);
  }

  async function handleSave() {
    setError('');
    setSuccess('');

    const tLiters = tankEnabled && tankLiters.trim() ? Number(tankLiters) : null;
    const mLiters = machineEnabled && machineLiters.trim() ? Number(machineLiters) : null;

    const hasTank = tankEnabled && !!tLiters && tLiters > 0;
    const hasMachine = machineEnabled && !!mLiters && mLiters > 0;

    if (!hasTank && !hasMachine) {
      setError('Activá al menos un bloque e ingresá litros.');
      return;
    }
    if (hasTank && !tankId) {
      setError('Seleccioná un estanque.');
      return;
    }
    if (hasMachine && !machineId) {
      setError('Seleccioná una máquina o vehículo.');
      return;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError('Fecha inválida. Formato: AAAA-MM-DD');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('No hay sesión activa.');
      setLoading(false);
      return;
    }

    let invoiceUrl: string | null = null;
    if (invoiceUri) {
      invoiceUrl = await uploadFactura(invoiceUri, user.id);
    }

    const { error: saveError } = await createCargaEstacion({
      date,
      tankId: hasTank ? tankId : null,
      tankLiters: hasTank ? tLiters : null,
      machineId: hasMachine ? machineId : null,
      machineLiters: hasMachine ? mLiters : null,
      invoiceUrl,
      userId: user.id,
    });

    setLoading(false);

    if (saveError) {
      setError(saveError);
    } else {
      setSuccess('¡Carga registrada correctamente!');
      setTimeout(() => navigation.goBack(), 1500);
    }
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
          <Text style={styles.pageTitle}>Carga en estación</Text>
          <Text style={styles.pageDesc}>Selecciona qué quieres cargar y los litros. Adjunta foto de la factura si tienes.</Text>

          <SuccessMessage message={success} />
          <ErrorMessage message={error} />

          {/* Fecha */}
          <Text style={styles.label}>Fecha</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#BBB"
            keyboardType="numeric"
          />

          {/* ── BLOQUE ESTANQUE ── */}
          <View style={styles.blockCard}>
            <View style={styles.blockHeader}>
              <View>
                <Text style={styles.blockTitle}>Carga a estanque</Text>
                <Text style={styles.blockSub}>Actualiza el stock del estanque</Text>
              </View>
              <Switch
                value={tankEnabled}
                onValueChange={(v) => {
                  setTankEnabled(v);
                  if (!v) { setTankId(null); setTankLiters(''); }
                }}
                trackColor={{ false: '#E5E7EB', true: '#1D9E75' }}
                thumbColor="#FFF"
              />
            </View>

            {tankEnabled && (
              <View style={styles.blockBody}>
                <TankSelector
                  value={tankId}
                  onChange={(t) => setTankId(t.id)}
                />
                <Text style={styles.label}>Litros cargados</Text>
                <TextInput
                  style={styles.input}
                  value={tankLiters}
                  onChangeText={setTankLiters}
                  placeholder="Ej: 1000"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {/* ── BLOQUE EQUIPO ── */}
          <View style={styles.blockCard}>
            <View style={styles.blockHeader}>
              <View>
                <Text style={styles.blockTitle}>Carga directa a equipo</Text>
                <Text style={styles.blockSub}>Carga directa sin pasar por estanque</Text>
              </View>
              <Switch
                value={machineEnabled}
                onValueChange={(v) => {
                  setMachineEnabled(v);
                  if (!v) { setMachineId(null); setMachineLiters(''); }
                }}
                trackColor={{ false: '#E5E7EB', true: '#1D9E75' }}
                thumbColor="#FFF"
              />
            </View>

            {machineEnabled && (
              <View style={styles.blockBody}>
                <MachineSelector
                  value={machineId}
                  onChange={(m) => setMachineId(m.id)}
                  label="Máquina / Vehículo"
                />
                <Text style={styles.label}>Litros cargados</Text>
                <TextInput
                  style={styles.input}
                  value={machineLiters}
                  onChangeText={setMachineLiters}
                  placeholder="Ej: 200"
                  placeholderTextColor="#BBB"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {/* Total */}
          {showTotal && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total litros</Text>
              <Text style={styles.totalValue}>{total.toLocaleString('es-CL')} L</Text>
            </View>
          )}

          {/* Foto factura */}
          <Text style={styles.label}>Foto factura (opcional)</Text>
          <TouchableOpacity style={styles.photoBtn} onPress={showImagePicker} activeOpacity={0.7}>
            <Text style={styles.photoBtnText}>
              {invoiceUri ? '📷 Cambiar foto' : '📷 Adjuntar foto factura'}
            </Text>
          </TouchableOpacity>
          {invoiceUri && (
            <Image source={{ uri: invoiceUri }} style={styles.preview} resizeMode="cover" />
          )}

          {/* Guardar */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Registrar carga</Text>
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
  // Bloques
  blockCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  blockTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  blockSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  blockBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    paddingTop: 8,
  },
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#B45309' },
  // Foto
  photoBtn: {
    borderWidth: 1.5,
    borderColor: '#1D9E75',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F0FDF8',
    marginTop: 4,
  },
  photoBtnText: { fontSize: 16, color: '#1D9E75', fontWeight: '600' },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#EEE',
  },
  // Botones
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
