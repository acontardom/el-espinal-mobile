import supabase from './supabase';

export async function getCumplimiento(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 29);
  const fromDate = from.toISOString().split('T')[0];

  const { data } = await supabase
    .from('hourly_reports')
    .select('reported_date')
    .eq('operator_id', user.id)
    .gte('reported_date', fromDate);

  return new Set((data ?? []).map((r: { reported_date: string }) => r.reported_date));
}
