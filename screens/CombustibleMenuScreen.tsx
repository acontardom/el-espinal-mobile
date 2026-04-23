import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type AppStackParams = {
  CargaEstacion: undefined;
  Combustible: undefined;
};

export default function CombustibleMenuScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Combustible</Text>
        <Text style={styles.subheading}>¿Qué quieres hacer?</Text>
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => navigation.navigate('CargaEstacion')}
          activeOpacity={0.8}
        >
          <View style={styles.optionLeft}>
            <Text style={styles.optionIcon}>⛽</Text>
            <View>
              <Text style={styles.optionTitle}>Cargar en estación</Text>
              <Text style={styles.optionSub}>Carga a estanque y/o equipo</Text>
            </View>
          </View>
          <Text style={styles.optionChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => navigation.navigate('Combustible')}
          activeOpacity={0.8}
        >
          <View style={styles.optionLeft}>
            <Text style={styles.optionIcon}>🔽</Text>
            <View>
              <Text style={styles.optionTitle}>Descargar a máquina</Text>
              <Text style={styles.optionSub}>Descarga desde estanque</Text>
            </View>
          </View>
          <Text style={styles.optionChevron}>›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, padding: 24, paddingTop: 8, gap: 12 },
  heading: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subheading: { fontSize: 15, color: '#666', marginBottom: 24 },
  optionBtn: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1D9E75',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  optionIcon: { fontSize: 28 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  optionSub: { fontSize: 13, color: '#666', marginTop: 2 },
  optionChevron: { fontSize: 20, color: '#1D9E75', fontWeight: '600' },
});
