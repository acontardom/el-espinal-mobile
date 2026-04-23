import supabase from './supabase';

interface CargaEstacionData {
  date: string;
  // bloque estanque
  tankId: string | null;
  tankLiters: number | null;
  // bloque equipo
  machineId: string | null;
  machineLiters: number | null;
  // foto (url ya subida)
  invoiceUrl: string | null;
  userId: string;
}

export async function uploadFactura(uri: string, userId: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from('facturas')
      .upload(fileName, blob, { contentType: 'image/jpeg' });
    if (error) {
      console.error('[uploadFactura] error:', error);
      return null;
    }
    const { data } = supabase.storage.from('facturas').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (e) {
    console.error('[uploadFactura] exception:', e);
    return null;
  }
}

export async function createCargaEstacion(data: CargaEstacionData): Promise<{ error: string | null }> {
  const { date, tankId, tankLiters, machineId, machineLiters, invoiceUrl, userId } = data;

  const hasTank = !!tankId && !!tankLiters && tankLiters > 0;
  const hasMachine = !!machineId && !!machineLiters && machineLiters > 0;

  if (!hasTank && !hasMachine) {
    return { error: 'Ingresa litros en al menos un bloque.' };
  }

  // Bloque estanque: insert en tank_movements + actualizar current_liters
  if (hasTank) {
    const { data: tank, error: tankFetchError } = await supabase
      .from('tanks')
      .select('current_liters')
      .eq('id', tankId!)
      .single();

    if (tankFetchError || !tank) {
      return { error: 'No se encontró el estanque seleccionado.' };
    }

    const { error: movError } = await supabase.from('tank_movements').insert({
      type: 'carga',
      tank_id: tankId,
      machine_id: null,
      movement_date: date,
      liters: tankLiters,
      invoice_image_url: invoiceUrl,
      created_by: userId,
    });

    if (movError) {
      console.error('[createCargaEstacion] tank_movements error:', movError);
      return { error: `Error al registrar estanque: ${movError.message}` };
    }

    await supabase
      .from('tanks')
      .update({ current_liters: tank.current_liters + tankLiters! })
      .eq('id', tankId!);
  }

  // Bloque equipo: insert en direct_fuel_entries
  if (hasMachine) {
    const { error: entryError } = await supabase.from('direct_fuel_entries').insert({
      entry_date: date,
      machine_id: machineId,
      liters: machineLiters,
      invoice_image_url: invoiceUrl,
      created_by: userId,
    });

    if (entryError) {
      console.error('[createCargaEstacion] direct_fuel_entries error:', entryError);
      return { error: `Error al registrar equipo: ${entryError.message}` };
    }
  }

  return { error: null };
}
