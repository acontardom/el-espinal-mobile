import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  reportedDates: Set<string>;
}

interface DayCell {
  key: string;
  dayNum: number;
  isToday: boolean;
  isWeekend: boolean;
  hasReport: boolean;
  isEmpty: boolean;
}

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function CumplimientoCalendario({ reportedDates }: Props) {
  const todayStr = toISO(new Date());

  const { cells, workingDays, reportedWorkingDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayCell[] = [];
    let workingDays = 0;
    let reportedWorkingDays = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toISO(d);
      const jsDay = d.getDay(); // 0=Dom, 6=Sab
      const isWeekend = jsDay === 0 || jsDay === 6;
      const hasReport = reportedDates.has(dateStr);

      if (!isWeekend) {
        workingDays++;
        if (hasReport) reportedWorkingDays++;
      }

      days.push({
        key: dateStr,
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isWeekend,
        hasReport,
        isEmpty: false,
      });
    }

    // Pad start so column 0 = Monday (JS Sun=0 → Mon-index 6)
    const firstJsDay = new Date(days[0].key + 'T00:00:00').getDay();
    const padCount = (firstJsDay + 6) % 7;
    const empties: DayCell[] = Array.from({ length: padCount }, (_, i) => ({
      key: `empty-${i}`,
      dayNum: 0,
      isToday: false,
      isWeekend: false,
      hasReport: false,
      isEmpty: true,
    }));

    return { cells: [...empties, ...days], workingDays, reportedWorkingDays };
  }, [reportedDates, todayStr]);

  return (
    <View style={styles.root}>
      {/* Headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((h, i) => (
          <View key={i} style={styles.headerCell}>
            <Text style={[styles.headerText, i >= 5 && styles.headerWeekend]}>{h}</Text>
          </View>
        ))}
      </View>

      {/* Grilla flat con flexWrap */}
      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.isEmpty) {
            return <View key={cell.key} style={styles.cell} />;
          }

          const bg = cell.hasReport
            ? '#1D9E75'
            : cell.isWeekend
            ? '#E5E7EB'
            : '#FCA5A5';

          const textColor = cell.hasReport
            ? '#FFFFFF'
            : cell.isWeekend
            ? '#9CA3AF'
            : '#DC2626';

          return (
            <View key={cell.key} style={styles.cell}>
              <View
                style={[
                  styles.dayInner,
                  { backgroundColor: bg },
                  cell.isToday && styles.todayBorder,
                ]}
              >
                <Text style={[styles.dayText, { color: textColor }]}>
                  {cell.dayNum}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Leyenda y contador */}
      <View style={styles.footer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#1D9E75' }]} />
          <Text style={styles.legendLabel}>Reportado</Text>
          <View style={[styles.legendDot, { backgroundColor: '#FCA5A5', marginLeft: 12 }]} />
          <Text style={styles.legendLabel}>Sin reporte</Text>
          <View style={[styles.legendDot, { backgroundColor: '#E5E7EB', marginLeft: 12 }]} />
          <Text style={styles.legendLabel}>Fin de semana</Text>
        </View>
        <Text style={styles.counterText}>
          <Text style={styles.counterHighlight}>{reportedWorkingDays}</Text>
          {' de '}
          <Text style={styles.counterHighlight}>{workingDays}</Text>
          {' días hábiles reportados'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  headerCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  headerWeekend: {
    color: '#9CA3AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayBorder: {
    borderWidth: 2.5,
    borderColor: '#1D9E75',
  },
  footer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  counterText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  counterHighlight: {
    fontWeight: '800',
    color: '#1D9E75',
  },
});
