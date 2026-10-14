import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { CalendarDays, CheckCircle2, Clock3, IndianRupee, TestTube } from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { useAuthContext } from '../../context/AuthContext';
import { useLabTechnicianDashboard } from '../../hooks/useLabTechnicianDashboard';

interface Props {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onNavigateScreen?: (path: string) => void;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const weekStartKey = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateKey(date);
};

function MetricCard({
  title,
  value,
  icon,
  iconBg,
  onPress,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.metricCard}>
      {/* Decorative top-right circle glow */}
      <View style={styles.cardCornerCircle} />

      <View style={styles.metricContentRow}>
        <View style={styles.metricInfoCol}>
          <Text style={styles.metricTitle}>{title}</Text>
          <Text style={styles.metricValue}>{value}</Text>
          <View style={styles.metricActionWrap}>
            <Text style={styles.metricActionText}>View details ↗</Text>
          </View>
        </View>

        <View style={[styles.metricIconBox, { backgroundColor: iconBg }]}>
          {icon}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface ChartCardProps {
  title: string;
  values: Array<{ label: string; value: number }>;
  color: string;
  isCurrency?: boolean;
  width: number;
}

function MetricBarChartCard({ title, values, color, isCurrency = false, width }: ChartCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const chartWidth = Math.max(280, width - 64);
  const chartHeight = 220;
  const top = 16;
  const bottom = 34;
  const plotHeight = chartHeight - top - bottom;
  const leftMargin = 28;
  const rightMargin = 8;
  const plotWidth = chartWidth - leftMargin - rightMargin;

  const ticks = useMemo(() => {
    const maxVal = Math.max(0, ...values.map(v => v.value));
    if (maxVal === 0 || maxVal <= 4) {
      return [4, 3, 2, 1, 0];
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const normalized = maxVal / magnitude;
    let niceMax = 10;
    if (normalized <= 1) niceMax = 1;
    else if (normalized <= 2) niceMax = 2;
    else if (normalized <= 5) niceMax = 5;
    else niceMax = 10;
    const roundedMax = niceMax * magnitude;
    const step = roundedMax / 4;
    return [roundedMax, step * 3, step * 2, step, 0];
  }, [values]);

  const maxTick = ticks[0] || 1;
  const slotWidth = plotWidth / Math.max(values.length, 1);
  const barWidth = Math.min(26, slotWidth * 0.58);

  const formatTickLabel = (val: number) => {
    if (val === 0) return '0';
    if (isCurrency && val >= 1000) return `${Math.round(val / 1000)}k`;
    return String(Math.round(val));
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Horizontal Grid lines & Y-Axis labels */}
          {ticks.map((tickVal, index) => {
            const y = top + (plotHeight / 4) * index;
            return (
              <React.Fragment key={`grid-${index}`}>
                <Line
                  x1={leftMargin}
                  x2={chartWidth - rightMargin}
                  y1={y}
                  y2={y}
                  stroke={index === 4 ? '#E2E8F0' : '#F1F5F9'}
                  strokeWidth={1}
                />
                <SvgText
                  x={leftMargin - 8}
                  y={y + 4}
                  fontSize="11"
                  fill="#94A3B8"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {formatTickLabel(tickVal)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Bars and X-Axis date labels */}
          {values.map((item, index) => {
            const x = leftMargin + slotWidth * index + (slotWidth - barWidth) / 2;
            const barHeight = maxTick > 0 ? (item.value / maxTick) * plotHeight : 0;
            const y = top + plotHeight - barHeight;
            const isSelected = selectedIdx === index;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {/* Clickable transparent touch area */}
                <Rect
                  x={leftMargin + slotWidth * index}
                  y={top}
                  width={slotWidth}
                  height={plotHeight + 25}
                  fill="transparent"
                  onPress={() => setSelectedIdx(selectedIdx === index ? null : index)}
                />

                {/* Bar */}
                {barHeight > 0 && (
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={6}
                    ry={6}
                    fill={color}
                    opacity={isSelected ? 0.82 : 1}
                    onPress={() => setSelectedIdx(selectedIdx === index ? null : index)}
                  />
                )}

                {/* X-axis date label */}
                <SvgText
                  x={leftMargin + slotWidth * index + slotWidth / 2}
                  y={top + plotHeight + 20}
                  fontSize="10"
                  fill={isSelected ? '#0F172A' : '#94A3B8'}
                  fontWeight={isSelected ? '700' : '500'}
                  textAnchor="middle"
                  onPress={() => setSelectedIdx(selectedIdx === index ? null : index)}
                >
                  {item.label}
                </SvgText>

                {/* Value above bar if tapped or if > 0 */}
                {(isSelected || (item.value > 0 && barHeight > 18)) && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={Math.max(12, y - 6)}
                    fontSize="10"
                    fill="#334155"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {isCurrency ? `₹${item.value}` : String(item.value)}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

export const LabTechnicianDashboardScreen: React.FC<Props> = ({ onOpenDrawer, onOpenNotifications, onNavigateScreen = () => {} }) => {
  const { user } = useAuthContext();
  const { width } = useWindowDimensions();
  const { data, loading, refreshing, error, refresh } = useLabTechnicianDashboard();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const staffName = String(user?.fullName || user?.full_name || user?.name || '').trim();
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const today = dateKey(now);
  const weekStart = weekStartKey();
  const dayRange = `/lab/tests?status=completed&date=${today}`;
  const weekRange = `/lab/tests?status=completed&date_from=${weekStart}&date_to=${today}`;

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} onOpenNotifications={onOpenNotifications} title="Lab Dashboard" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0D9488" />}
      >
        {/* ── 1. GREETING & TODAY CARD ── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {greeting}{staffName ? `, ${staffName}` : ''}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening at your clinic today.
          </Text>

          {/* Today Date Card */}
          <View style={styles.todayDateCard}>
            <View style={styles.todayIconBox}>
              <CalendarDays size={22} color="#0D9488" strokeWidth={2.2} />
            </View>
            <View style={styles.todayTextCol}>
              <View style={styles.todayBadgeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
              <Text style={styles.todayDateText}>{todayLabel}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#0D9488" />
            <Text style={styles.muted}>Loading lab dashboard…</Text>
          </View>
        ) : null}

        {error ? (
          <TouchableOpacity onPress={refresh} style={styles.errorBox}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {!loading ? (
          <>
            <View style={styles.metricGrid}>
              <MetricCard
                title="Pending Tests"
                value={String(data.pendingTests)}
                icon={<Clock3 size={20} color="#0D9488" strokeWidth={2.2} />}
                iconBg="#CCFBF1"
                onPress={() => onNavigateScreen('/lab/tests?status=pending')}
              />
              <MetricCard
                title="Completed Today"
                value={String(data.completedToday)}
                icon={<CheckCircle2 size={20} color="#16A34A" strokeWidth={2.2} />}
                iconBg="#DCFCE7"
                onPress={() => onNavigateScreen(dayRange)}
              />
              <MetricCard
                title="Completed This Week"
                value={String(data.completedWeek)}
                icon={<TestTube size={20} color="#D97706" strokeWidth={2.2} />}
                iconBg="#FEF3C7"
                onPress={() => onNavigateScreen(weekRange)}
              />
              <MetricCard
                title="Weekly Revenue"
                value={money(data.weeklyRevenue)}
                icon={<IndianRupee size={20} color="#0D9488" strokeWidth={2.2} />}
                iconBg="#CCFBF1"
                onPress={() => onNavigateScreen(weekRange)}
              />
            </View>

            <MetricBarChartCard
              title="Daily Completed Tests · Last 7 Days"
              values={data.dailyCompleted}
              color="#14B8A6"
              width={width}
            />

            <MetricBarChartCard
              title="Daily Lab Revenue (₹) · Last 7 Days"
              values={data.dailyRevenue}
              color="#0EA5E9"
              isCurrency
              width={width}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 36, gap: 16 },

  // Greeting & Date Card
  greetingSection: { marginBottom: 4 },
  greetingTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  greetingSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  todayDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    gap: 12,
    shadowColor: '#0D9488',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  todayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTextCol: { flex: 1 },
  todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  greenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#0D9488' },
  todayBadgeText: { fontSize: 11, fontWeight: '800', color: '#0D9488', letterSpacing: 1.4 },
  todayDateText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  // Metric Cards
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    minHeight: 126,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardCornerCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F0FDFA',
  },
  metricContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricInfoCol: {
    flex: 1,
    paddingRight: 6,
  },
  metricTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  metricActionWrap: {
    marginTop: 10,
  },
  metricActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  metricIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loading: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center', gap: 8 },
  muted: { color: '#64748B', fontSize: 13 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 },
  errorText: { color: '#B91C1C', fontSize: 13 },
});

export default LabTechnicianDashboardScreen;
