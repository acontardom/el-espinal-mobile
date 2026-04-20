import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import supabase from '../lib/supabase';

interface Machine {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Props {
  value: string | null;
  onChange: (machine: Machine) => void;
  label?: string;
}

export default function MachineSelector({ value, onChange, label = 'Máquina' }: Props) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const selected = machines.find((m) => m.id === value);

  useEffect(() => {
    supabase
      .from('machines')
      .select('id, code, name, type')
      .eq('status', 'activo')
      .order('name')
      .then(({ data, error }) => {
        console.log('[MachineSelector] data:', data, 'error:', error);
        if (data) setMachines(data);
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#1D9E75" />
        ) : (
          <Text style={selected ? styles.selectedText : styles.placeholder}>
            {selected ? `${selected.code} — ${selected.name}` : 'Seleccionar máquina'}
          </Text>
        )}
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar máquina</Text>
            <FlatList
              data={machines}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.id === value && styles.optionSelected]}
                  onPress={() => {
                    onChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.optionCode}>{item.code}</Text>
                  <Text style={styles.optionName}>{item.name}</Text>
                  <Text style={styles.optionType}>{item.type}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6 },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CCC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  selectedText: { flex: 1, fontSize: 16, color: '#111' },
  placeholder: { flex: 1, fontSize: 16, color: '#AAA' },
  arrow: { fontSize: 18, color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#111',
  },
  option: { paddingHorizontal: 20, paddingVertical: 14 },
  optionSelected: { backgroundColor: '#E8F8F2' },
  optionCode: { fontSize: 13, color: '#1D9E75', fontWeight: '700' },
  optionName: { fontSize: 16, color: '#111', fontWeight: '500' },
  optionType: { fontSize: 13, color: '#888' },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  cancelBtn: {
    borderTopWidth: 1,
    borderColor: '#EEE',
    padding: 18,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, color: '#E74C3C', fontWeight: '600' },
});
