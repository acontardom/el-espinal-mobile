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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../lib/supabase';
import TankSelector from '../components/TankSelector';
import MachineSelector from '../components/MachineSelector';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

type MovementType = 'carga' | 'descarga';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function CombustibleScreen() {
  const navigation = useNavigation();
  const [movType, setMovType] = useState<MovementType>('carga');
  const [tankId, setTankId] = useState<string | null>(null);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [liters, setLiters] = useState('');
  const [invoiceUri, setInvoiceUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setInvoiceUri(result.assets[0].uri);
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar la factura.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setInvoiceUri(result.assets[0].uri);
    }
  }

  async function uploadInvoice(uri: string, userId: string): Promise<string | null> {
    try {
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `invoices/${userId}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('tank-invoices')
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}` });
      if (uploadError) return null;
      const { data } = supabase.storage.from('tank-invoices').getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    setError('');
    setSuccess('');

    if (!tankId) return setError('Selecciona un estanque.');
    if (movType === 'descarga' && !machineId) return setError('Selecciona una máquina.');
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
    const newLiters =
      movType === 'carga'
        ? tank.current_liters + litersNum
        : tank.current_liters - litersNum;

    if (newLiters < 0) {
      setError(`No hay suficiente combustible. Disponible: ${tank.current_liters} L`);
      setLoading(false);
      return;
    }

    let invoiceUrl: string | null = null;
    if (movType === 'carga' && invoiceUri) {
      invoiceUrl = await uploadInvoice(invoiceUri, user.id);
    }

    const { error: insertError } = await supabase.from('tank_movements').insert({
      type: movType,
      tank_id: tankId,
      machine_id: movType === 'descarga' ? machineId : null,
      movement_date: date,
      liters: litersNum,
      invoice_image_url: invoiceUrl,
      created_by: user.id,
    });

    if (insertError) {
      setError('Error al guardar. Intenta nuevamente.');
      setLoading(false);
      return;
    }

    await supabase.from('tanks').update({ current_liters: newLiters }).eq('id', tankId);

    setLoading(false);
    setSuccess('¡Movimiento registrado correctamente!');
    setTimeout(() => navigation.goBack(), 1500);
  }

  return (
    <SafeAreaView style={styles.flex}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Registrar combustible</Text>

        <Text style={styles.label}>Tipo de movimiento</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, movType === 'carga' && styles.typeBtnActive]}
            onPress={() => {
              setMovType('carga');
              setMachineId(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeIcon]}>⬆️</Text>
            <Text style={[styles.typeBtnText, movType === 'carga' && styles.typeBtnTextActive]}>
              Carga
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, movType === 'descarga' && styles.typeBtnActiveBlue]}
            onPress={() => {
              setMovType('descarga');
              setInvoiceUri(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.typeIcon}>⬇️</Text>
            <Text
              style={[styles.typeBtnText, movType === 'descarga' && styles.typeBtnTextActive]}
            >
              Descarga
            </Text>
          </TouchableOpacity>
        </View>

        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        <TankSelector value={tankId} onChange={(t) => setTankId(t.id)} />

        {movType === 'descarga' && (
          <MachineSelector
            value={machineId}
            onChange={(m) => setMachineId(m.id)}
            label="Máquina receptora"
          />
        )}

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

        {movType === 'carga' && (
          <View style={styles.invoiceSection}>
            <Text style={styles.label}>Foto factura (opcional)</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={showImagePicker} activeOpacity={0.7}>
              <Text style={styles.photoBtnText}>
                {invoiceUri ? '📷 Cambiar foto' : '📷 Adjuntar foto factura'}
              </Text>
            </TouchableOpacity>
            {invoiceUri && (
              <Image source={{ uri: invoiceUri }} style={styles.preview} resizeMode="cover" />
            )}
          </View>
        )}

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
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  typeBtnActive: { borderColor: '#1D9E75', backgroundColor: '#E8F8F2' },
  typeBtnActiveBlue: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  typeIcon: { fontSize: 20 },
  typeBtnText: { fontSize: 17, fontWeight: '700', color: '#888' },
  typeBtnTextActive: { color: '#111' },
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
  invoiceSection: { marginTop: 4 },
  photoBtn: {
    borderWidth: 1.5,
    borderColor: '#1D9E75',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F0FDF8',
  },
  photoBtnText: { fontSize: 16, color: '#1D9E75', fontWeight: '600' },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#EEE',
  },
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
