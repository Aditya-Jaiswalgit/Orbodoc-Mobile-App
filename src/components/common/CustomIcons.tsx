import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { getIconPngUri } from '../../utils/pixelIconEngine';

interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

// Universal Web SVG renderer for 100% exact Lucide vector precision on web
const renderWebSvg = (
  size: number,
  color: string,
  elements: Array<{ tag: string; props: Record<string, any> }>,
  strokeWidth: number = 2
) => {
  if (Platform.OS === 'web') {
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: color,
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        style: { display: 'inline-block', verticalAlign: 'middle' },
      },
      elements.map((el, i) => React.createElement(el.tag, { key: i, ...el.props }))
    );
  }
  return null;
};

export const DashboardIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  const boxSize = size * 0.42;
  return (
    <View style={[styles.gridContainer, { width: size, height: size }]}>
      <View style={[styles.gridRow]}>
        <View style={[styles.gridBox, { width: boxSize, height: boxSize, borderColor: color }]} />
        <View style={[styles.gridBox, { width: boxSize, height: boxSize, borderColor: color }]} />
      </View>
      <View style={[styles.gridRow]}>
        <View style={[styles.gridBox, { width: boxSize, height: boxSize, borderColor: color }]} />
        <View style={[styles.gridBox, { width: boxSize, height: boxSize, borderColor: color }]} />
      </View>
    </View>
  );
};

export const CalendarIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 22, strokeWidth = 2.2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M8 2v4' } },
      { tag: 'path', props: { d: 'M16 2v4' } },
      { tag: 'rect', props: { width: '18', height: '18', x: '3', y: '4', rx: '2' } },
      { tag: 'path', props: { d: 'M3 10h18' } },
      { tag: 'path', props: { d: 'M8 14h.01' } },
      { tag: 'path', props: { d: 'M12 14h.01' } },
      { tag: 'path', props: { d: 'M16 14h.01' } },
      { tag: 'path', props: { d: 'M8 18h.01' } },
      { tag: 'path', props: { d: 'M12 18h.01' } },
      { tag: 'path', props: { d: 'M16 18h.01' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('calendar-days', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const PatientUserIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  const headSize = size * 0.38;
  return (
    <View style={[styles.userContainer, { width: size, height: size }]}>
      <View
        style={[
          styles.userHead,
          { width: headSize, height: headSize, borderRadius: headSize / 2, borderColor: color },
        ]}
      />
      <View
        style={[
          styles.userBody,
          {
            width: size * 0.8,
            height: size * 0.4,
            borderTopLeftRadius: size * 0.4,
            borderTopRightRadius: size * 0.4,
            borderColor: color,
          },
        ]}
      />
    </View>
  );
};

export const ReceiptIcon: React.FC<IconProps> = ({ color = '#0f172a', size = 24, strokeWidth = 2.2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z' } },
      { tag: 'path', props: { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' } },
      { tag: 'path', props: { d: 'M12 17.5v-11' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  const pngUri = getIconPngUri('receipt', color, strokeWidth);
  return <Image source={{ uri: pngUri }} style={{ width: size, height: size }} resizeMode="contain" />;
};

export const BillingCardIcon: React.FC<IconProps> = (props) => <ReceiptIcon {...props} />;
export const TreatmentBillsIcon: React.FC<IconProps> = (props) => <ReceiptIcon {...props} />;

export const MedicinePillIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  return (
    <View
      style={[
        styles.pillOuter,
        { width: size * 0.9, height: size * 0.48, borderRadius: size * 0.24, borderColor: color },
      ]}>
      <View style={[styles.pillDivider, { backgroundColor: color }]} />
    </View>
  );
};

export const VideoCamIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  return (
    <View style={[styles.videoContainer, { width: size, height: size }]}>
      <View style={[styles.videoBody, { width: size * 0.65, height: size * 0.55, borderColor: color }]} />
      <View style={[styles.videoLens, { borderLeftColor: color }]} />
    </View>
  );
};

export const LabTubeIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2' } },
      { tag: 'path', props: { d: 'M8.5 2h7' } },
      { tag: 'path', props: { d: 'M9.5 12h5' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  const pngUri = getIconPngUri('tube', color, strokeWidth);
  return <Image source={{ uri: pngUri }} style={{ width: size, height: size }} resizeMode="contain" />;
};

export const LabUsersIcon: React.FC<IconProps> = ({ color = '#3b82f6', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' } },
      { tag: 'circle', props: { cx: '9', cy: '7', r: '4' } },
      { tag: 'path', props: { d: 'M22 21v-2a4 4 0 0 0-3-3.87' } },
      { tag: 'path', props: { d: 'M16 3.13a4 4 0 0 1 0 7.75' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  const pngUri = getIconPngUri('users', color, strokeWidth);
  return <Image source={{ uri: pngUri }} style={{ width: size, height: size }} resizeMode="contain" />;
};

export const ClipboardCheckIcon: React.FC<IconProps> = ({ color = '#f59e0b', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'rect', props: { width: '8', height: '4', x: '8', y: '2', rx: '1', ry: '1' } },
      { tag: 'path', props: { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' } },
      { tag: 'path', props: { d: 'm9 14 2 2 4-4' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  const pngUri = getIconPngUri('clipboard-check', color, strokeWidth);
  return <Image source={{ uri: pngUri }} style={{ width: size, height: size }} resizeMode="contain" />;
};

export const BellNotificationIcon: React.FC<IconProps> = ({ color = '#334155', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' } },
    { tag: 'path', props: { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('bell', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const ViewDetailsIcon: React.FC<IconProps> = ({ color = '#334155', size = 18, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' } },
      { tag: 'circle', props: { cx: '12', cy: '12', r: '3' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size * 0.58,
          borderRadius: size * 0.29,
          borderWidth: 1.8,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: size * 0.13,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
};

export const BillingEyeIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 18, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' } },
      { tag: 'circle', props: { cx: '12', cy: '12', r: '3' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri: getIconPngUri('eye', color, strokeWidth) }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
};

export const BillingSlidersIcon: React.FC<IconProps> = ({ color = '#334155', size = 18, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'line', props: { x1: '8', y1: '6', x2: '21', y2: '6' } },
      { tag: 'circle', props: { cx: '6', cy: '6', r: '2.8' } },
      { tag: 'line', props: { x1: '3', y1: '18', x2: '16', y2: '18' } },
      { tag: 'circle', props: { cx: '18', cy: '18', r: '2.8' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, justifyContent: 'space-around', paddingVertical: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.6, borderColor: color }} />
        <View style={{ flex: 1, height: 1.8, backgroundColor: color }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: 1.8, backgroundColor: color }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.6, borderColor: color }} />
      </View>
    </View>
  );
};

export const BillingWhatsAppIcon: React.FC<IconProps> = ({ color = '#22c55e', size = 18, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      {
        tag: 'path',
        props: {
          d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
        },
      },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: (size * 0.9) / 2,
          borderWidth: 1.8,
          borderColor: color,
          borderBottomLeftRadius: 2,
        }}
      />
    </View>
  );
};

export const BillingMailIcon: React.FC<IconProps> = ({ color = '#3b82f6', size = 18, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'rect', props: { width: '20', height: '16', x: '2', y: '4', rx: '2' } },
      { tag: 'path', props: { d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.95,
          height: size * 0.72,
          borderRadius: 3,
          borderWidth: 1.8,
          borderColor: color,
        }}
      />
    </View>
  );
};

export const BillingPaymentCardIcon: React.FC<IconProps> = ({ color = '#475569', size = 18, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'rect', props: { width: '20', height: '14', x: '2', y: '5', rx: '2' } },
      { tag: 'line', props: { x1: '2', x2: '22', y1: '10', y2: '10' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.95,
          height: size * 0.68,
          borderRadius: 3,
          borderWidth: 1.8,
          borderColor: color,
          justifyContent: 'flex-start',
          paddingTop: 3,
        }}>
        <View style={{ width: '100%', height: 1.8, backgroundColor: color }} />
      </View>
    </View>
  );
};

export const BillingAlertCancelIcon: React.FC<IconProps> = ({ color = '#ef4444', size = 18, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'circle', props: { cx: '12', cy: '12', r: '10' } },
      { tag: 'line', props: { x1: '12', x2: '12', y1: '8', y2: '12' } },
      { tag: 'line', props: { x1: '12', x2: '12.01', y1: '16', y2: '16' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.8,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View style={{ width: 1.8, height: size * 0.35, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1, marginTop: 2 }} />
    </View>
  );
};

export const EditBillDollarIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 20, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'rect', props: { width: '20', height: '14', x: '2', y: '5', rx: '2' } },
      { tag: 'line', props: { x1: '12', y1: '8', x2: '12', y2: '16' } },
      { tag: 'path', props: { d: 'M9.5 9.8c0-.7.7-1.3 1.8-1.3 1.3 0 2 .6 2 1.3s-.8 1.1-2 1.3c-1.3.2-2 .7-2 1.4 0 .8.8 1.4 2.1 1.4 1.2 0 2-.6 2-1.3' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.95, height: size * 0.72, borderWidth: 1.8, borderColor: color, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: size * 0.46, fontWeight: '700', lineHeight: size * 0.52 }}>$</Text>
      </View>
    </View>
  );
};

export const BillInfoDocIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 18, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
      { tag: 'polyline', props: { points: '14 2 14 8 20 8' } },
      { tag: 'line', props: { x1: '16', y1: '13', x2: '8', y2: '13' } },
      { tag: 'line', props: { x1: '16', y1: '17', x2: '8', y2: '17' } },
      { tag: 'line', props: { x1: '10', y1: '9', x2: '8', y2: '9' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.75, height: size * 0.9, borderWidth: 1.8, borderColor: color, borderRadius: 2, padding: 2, justifyContent: 'space-evenly' }}>
        <View style={{ width: '45%', height: 1.5, backgroundColor: color }} />
        <View style={{ width: '75%', height: 1.5, backgroundColor: color }} />
        <View style={{ width: '60%', height: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
};

export const BillTrashIcon: React.FC<IconProps> = ({ color = '#ef4444', size = 17, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M3 6h18' } },
      { tag: 'path', props: { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' } },
      { tag: 'path', props: { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' } },
      { tag: 'line', props: { x1: '10', y1: '11', x2: '10', y2: '17' } },
      { tag: 'line', props: { x1: '14', y1: '11', x2: '14', y2: '17' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: size * 0.65, height: size * 0.75, borderWidth: 1.8, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, flexDirection: 'row', justifyContent: 'space-evenly', paddingTop: 2 }}>
        <View style={{ width: 1.5, height: '70%', backgroundColor: color }} />
        <View style={{ width: 1.5, height: '70%', backgroundColor: color }} />
      </View>
    </View>
  );
};

export const EditPenIcon: React.FC<IconProps> = ({ color = '#334155', size = 18 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.75,
          height: size * 0.75,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: 4,
          position: 'relative',
        }}>
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 3,
            height: 10,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
};

export const TiltedCapsuleIcon: React.FC<IconProps> = ({ color = '#0f172a', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'rect', props: { width: '18', height: '10', x: '3', y: '7', rx: '5', transform: 'rotate(-45 12 12)' } },
      { tag: 'line', props: { x1: '8.5', y1: '8.5', x2: '15.5', y2: '15.5' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] }}>
      <View
        style={{
          width: size * 0.9,
          height: size * 0.48,
          borderRadius: (size * 0.48) / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{ width: strokeWidth, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
};

export const InventoryPackageIcon: React.FC<IconProps> = ({ color = '#10b981', size = 20, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'm7.5 4.27 9 5.15' } },
      { tag: 'path', props: { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' } },
      { tag: 'path', props: { d: 'm3.3 7 8.7 5 8.7-5' } },
      { tag: 'path', props: { d: 'M12 22V12' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.8, borderWidth: strokeWidth, borderColor: color, borderRadius: 3 }} />
    </View>
  );
};

export const InventoryAlertTriangleIcon: React.FC<IconProps> = ({ color = '#f59e0b', size = 20, strokeWidth = 1.8 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' } },
      { tag: 'line', props: { x1: '12', y1: '9', x2: '12', y2: '13' } },
      { tag: 'line', props: { x1: '12', y1: '17', x2: '12.01', y2: '17' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.88, fontWeight: '700', lineHeight: size }}>⚠</Text>
    </View>
  );
};

export const InventoryRupeeIcon: React.FC<IconProps> = ({ color = '#3b82f6', size = 18 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 1.05, fontWeight: '700', lineHeight: size * 1.1 }}>₹</Text>
    </View>
  );
};

export const SparklesIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 14 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' } },
    { tag: 'path', props: { d: 'M5 3v4' } },
    { tag: 'path', props: { d: 'M19 17v4' } },
    { tag: 'path', props: { d: 'M3 5h4' } },
    { tag: 'path', props: { d: 'M17 19h4' } },
  ]);
  if (webSvg) return webSvg;
  return <Text style={{ color, fontSize: size * 0.9 }}>✨</Text>;
};

export const StethoscopeIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 22, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M11 2v2' } },
      { tag: 'path', props: { d: 'M5 2v2' } },
      { tag: 'path', props: { d: 'M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1' } },
      { tag: 'path', props: { d: 'M8 15a6 6 0 0 0 12 0v-3' } },
      { tag: 'circle', props: { cx: '20', cy: '10', r: '2' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('stethoscope', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const GlobeCareIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'circle', props: { cx: '12', cy: '12', r: '10' } },
    { tag: 'circle', props: { cx: '12', cy: '12', r: '4' } },
    { tag: 'line', props: { x1: '4.93', x2: '9.17', y1: '4.93', y2: '9.17' } },
    { tag: 'line', props: { x1: '14.83', x2: '19.07', y1: '14.83', y2: '19.07' } },
    { tag: 'line', props: { x1: '14.83', x2: '19.07', y1: '9.17', y2: '4.93' } },
    { tag: 'line', props: { x1: '14.83', x2: '9.17', y1: '14.83', y2: '19.07' } },
  ]);
  if (webSvg) return webSvg;

  return <Text style={{ color, fontSize: size * 0.9 }}>🌐</Text>;
};

export const FilterResetIcon: React.FC<IconProps> = ({ color = '#94a3b8', size = 16 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.06' } },
    { tag: 'path', props: { d: 'm22 3-5 5' } },
    { tag: 'path', props: { d: 'm17 3 5 5' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('filter-x', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const ChevronsUpDownIcon: React.FC<IconProps> = ({ color = '#94a3b8', size = 15 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'm7 15 5 5 5-5' } },
    { tag: 'path', props: { d: 'm7 9 5-5 5 5' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 1 }}>
      <View
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderLeftWidth: 1.6,
          borderTopWidth: 1.6,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderRightWidth: 1.6,
          borderBottomWidth: 1.6,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
};

export const SearchInputIcon: React.FC<IconProps> = ({ color = '#94a3b8', size = 16 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'circle', props: { cx: '11', cy: '11', r: '8' } },
    { tag: 'path', props: { d: 'm21 21-4.3-4.3' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('search', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const BuildingClinicIcon: React.FC<IconProps> = ({ color = '#64748b', size = 22 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' } },
    { tag: 'path', props: { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' } },
    { tag: 'path', props: { d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' } },
    { tag: 'path', props: { d: 'M10 6h4' } },
    { tag: 'path', props: { d: 'M10 10h4' } },
    { tag: 'path', props: { d: 'M10 14h4' } },
    { tag: 'path', props: { d: 'M10 18h4' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.58,
          height: size * 0.82,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingVertical: 2,
        }}>
        <View style={{ width: 4, height: 2, backgroundColor: color }} />
        <View style={{ width: 4, height: 2, backgroundColor: color }} />
        <View style={{ width: 4, height: 2, backgroundColor: color }} />
      </View>
    </View>
  );
};

export const MapPinIcon: React.FC<IconProps> = ({ color = '#64748b', size = 14 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' } },
    { tag: 'circle', props: { cx: '12', cy: '10', r: '3' } },
  ]);
  if (webSvg) return webSvg;

  return <Text style={{ color, fontSize: size * 0.9 }}>📍</Text>;
};

export const ArrowLeftIcon: React.FC<IconProps> = ({ color = '#334155', size = 18 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'm12 19-7-7 7-7' } },
    { tag: 'path', props: { d: 'M19 12H5' } },
  ]);
  if (webSvg) return webSvg;

  return <Text style={{ color, fontSize: size, fontWeight: '700' }}>←</Text>;
};

export const UsersIcon: React.FC<IconProps> = ({ color = '#0f172a', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' } },
    { tag: 'circle', props: { cx: '9', cy: '7', r: '4' } },
    { tag: 'path', props: { d: 'M22 21v-2a4 4 0 0 0-3-3.87' } },
    { tag: 'path', props: { d: 'M16 3.13a4 4 0 0 1 0 7.75' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('users', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const ActivityPulseIcon: React.FC<IconProps> = ({ color = '#10b981', size = 20, strokeWidth = 2.2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [{ tag: 'path', props: { d: 'M22 12h-4l-3 9L9 3l-3 9H2' } }],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('activity', color, strokeWidth) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const UserPlusIcon: React.FC<IconProps> = ({ color = '#ea580c', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' } },
    { tag: 'circle', props: { cx: '9', cy: '7', r: '4' } },
    { tag: 'line', props: { x1: '19', x2: '19', y1: '8', y2: '14' } },
    { tag: 'line', props: { x1: '22', x2: '16', y1: '11', y2: '11' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('user-plus', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const ColumnsIcon: React.FC<IconProps> = ({ color = '#0f172a', size = 16 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'rect', props: { width: '18', height: '18', x: '3', y: '3', rx: '2' } },
    { tag: 'path', props: { d: 'M9 3v18' } },
    { tag: 'path', props: { d: 'M15 3v18' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('columns', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const MoreVerticalIcon: React.FC<IconProps> = ({ color = '#0f172a', size = 18 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'circle', props: { cx: '12', cy: '12', r: '1.5' } },
    { tag: 'circle', props: { cx: '12', cy: '5', r: '1.5' } },
    { tag: 'circle', props: { cx: '12', cy: '19', r: '1.5' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('more-vertical', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const ClinicVerifiedIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 15 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'circle', props: { cx: '12', cy: '12', r: '10' } },
    { tag: 'path', props: { d: 'm9 12 2 2 4-4' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.4,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.65, color, fontWeight: '800', lineHeight: size * 0.75 }}>✓</Text>
    </View>
  );
};

export const PrescriptionIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 18 }) => {
  return (
    <View
      style={{
        width: size * 0.75,
        height: size,
        borderWidth: 1.8,
        borderColor: color,
        borderRadius: 4,
        padding: 2,
        justifyContent: 'space-around',
      }}>
      <View style={{ width: '80%', height: 1.8, backgroundColor: color }} />
      <View style={{ width: '60%', height: 1.8, backgroundColor: color }} />
      <View style={{ width: '75%', height: 1.8, backgroundColor: color }} />
    </View>
  );
};

export const MedicalHistoryIcon: React.FC<IconProps> = ({ color = '#334155', size = 18 }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.8,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: 1.8,
          height: size * 0.3,
          backgroundColor: color,
          position: 'absolute',
          top: 3,
        }}
      />
      <View
        style={{
          width: size * 0.25,
          height: 1.8,
          backgroundColor: color,
          position: 'absolute',
          right: 3,
        }}
      />
    </View>
  );
};

export const CalendarPlusIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 24 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M8 2v4' } },
    { tag: 'path', props: { d: 'M16 2v4' } },
    { tag: 'path', props: { d: 'M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8' } },
    { tag: 'path', props: { d: 'M3 10h18' } },
    { tag: 'path', props: { d: 'M16 19h6' } },
    { tag: 'path', props: { d: 'M19 16v6' } },
  ]);
  if (webSvg) return webSvg;

  const width = size;
  const height = size;
  const pinWidth = Math.max(2, size * 0.1);
  const pinHeight = Math.max(3.5, size * 0.18);
  return (
    <View style={{ width, height: height + 2, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: width * 0.22,
          zIndex: 2,
        }}>
        <View style={{ width: pinWidth, height: pinHeight, borderRadius: pinWidth / 2, backgroundColor: color }} />
        <View style={{ width: pinWidth, height: pinHeight, borderRadius: pinWidth / 2, backgroundColor: color }} />
      </View>
      <View
        style={{
          width,
          height: height - 1.5,
          borderRadius: Math.max(4, size * 0.2),
          borderWidth: 1.8,
          borderColor: color,
          backgroundColor: 'transparent',
          position: 'relative',
        }}>
        <View
          style={{
            position: 'absolute',
            top: height * 0.24,
            left: 0,
            right: 0,
            height: 1.6,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: size * 0.46,
            height: size * 0.46,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ position: 'absolute', width: 2.2, height: size * 0.42, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', height: 2.2, width: size * 0.42, backgroundColor: color, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
};

export const CalendarClockIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 26 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5' } },
    { tag: 'path', props: { d: 'M16 2v4' } },
    { tag: 'path', props: { d: 'M8 2v4' } },
    { tag: 'path', props: { d: 'M3 10h5' } },
    { tag: 'path', props: { d: 'M17.5 17.5 16 16.3V14' } },
    { tag: 'circle', props: { cx: '16', cy: '16', r: '6' } },
  ]);
  if (webSvg) return webSvg;

  const calW = size * 0.85;
  const calH = size * 0.85;
  const clockSize = size * 0.58;
  const clockRadius = clockSize / 2;
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 4,
          width: 2,
          height: 3.5,
          borderRadius: 1,
          backgroundColor: color,
          zIndex: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: calW * 0.55,
          width: 2,
          height: 3.5,
          borderRadius: 1,
          backgroundColor: color,
          zIndex: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          width: calW,
          height: calH,
          borderRadius: 4,
          borderWidth: 1.8,
          borderColor: color,
        }}>
        <View
          style={{
            position: 'absolute',
            top: calH * 0.26,
            left: 0,
            right: 0,
            height: 1.6,
            backgroundColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: clockSize,
          height: clockSize,
          borderRadius: clockRadius,
          borderWidth: 1.8,
          borderColor: color,
          backgroundColor: '#0f766e',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            position: 'absolute',
            top: clockRadius * 0.25,
            width: 1.6,
            height: clockRadius * 0.75,
            backgroundColor: color,
            borderRadius: 0.8,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: clockRadius - 0.8,
            width: clockRadius * 0.65,
            height: 1.6,
            backgroundColor: color,
            borderRadius: 0.8,
          }}
        />
        <View
          style={{
            width: 2.5,
            height: 2.5,
            borderRadius: 1.25,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
};

export const ReceiptBillIcon: React.FC<IconProps> = (props) => <ReceiptIcon {...props} />;

export const ReportDocIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 26 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' } },
    { tag: 'path', props: { d: 'M14 2v4a2 2 0 0 0 2 2h4' } },
    { tag: 'path', props: { d: 'M10 9H8' } },
    { tag: 'path', props: { d: 'M16 13H8' } },
    { tag: 'path', props: { d: 'M16 17H8' } },
  ]);
  if (webSvg) return webSvg;

  const w = size * 0.8;
  const h = size;
  const foldSize = size * 0.3;
  return (
    <View style={{ width: w, height: h, position: 'relative' }}>
      <View
        style={{
          width: w,
          height: h,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: 4,
          borderTopRightRadius: 0,
          paddingLeft: w * 0.18,
          paddingRight: w * 0.18,
          paddingTop: h * 0.36,
          justifyContent: 'space-around',
          paddingBottom: h * 0.14,
        }}>
        <View style={{ width: '100%', height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '100%', height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '60%', height: 2, backgroundColor: color, borderRadius: 1 }} />
      </View>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: foldSize,
          height: foldSize,
          borderLeftWidth: 1.8,
          borderBottomWidth: 1.8,
          borderColor: color,
          borderBottomLeftRadius: 3,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
};

export const IndianRupeeIcon: React.FC<IconProps> = ({ color = '#d97706', size = 26 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M6 3h12' } },
    { tag: 'path', props: { d: 'M6 8h12' } },
    { tag: 'path', props: { d: 'm6 13 8.5 8' } },
    { tag: 'path', props: { d: 'M6 13h3' } },
    { tag: 'path', props: { d: 'M9 13c6.667 0 6.667-10 0-10' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Text style={{ fontSize: size * 0.95, fontWeight: '700', color, textAlign: 'center', lineHeight: size * 1.1 }}>
      ₹
    </Text>
  );
};

export const CheckCircleIcon: React.FC<IconProps> = ({ color = '#16a34a', size = 26 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'circle', props: { cx: '12', cy: '12', r: '10' } },
    { tag: 'path', props: { d: 'm9 12 2 2 4-4' } },
  ]);
  if (webSvg) return webSvg;

  const stroke = Math.max(1.8, size * 0.09);
  const checkW = size * 0.44;
  const checkH = size * 0.24;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: checkW,
          height: checkH,
          borderLeftWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
          marginTop: -size * 0.08,
          marginLeft: size * 0.04,
        }}
      />
    </View>
  );
};

export const EnvelopePlusIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 16 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Image
        source={{ uri: getIconPngUri('envelope', color) }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <View
        style={{
          position: 'absolute',
          top: -3,
          right: -3,
          width: 13,
          height: 13,
          borderRadius: 6.5,
          backgroundColor: '#f59e0b',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.2,
          borderColor: '#ffffff',
        }}>
        <Text
          style={{
            color: '#000000',
            fontSize: 9,
            fontWeight: '900',
            lineHeight: 11,
            textAlign: 'center',
          }}>
          +
        </Text>
      </View>
    </View>
  );
};

export const ArrowUpRightIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 14 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M7 7h10v10' } },
    { tag: 'path', props: { d: 'M7 17 17 7' } },
  ]);
  if (webSvg) return webSvg;

  return <Text style={{ fontSize: size, fontWeight: '700', color }}>↗</Text>;
};

export const ChevronDownIcon: React.FC<IconProps> = ({ color = '#64748b', size = 16 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'm6 9 6 6 6-6' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('chevron-down', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const HamburgerMenuIcon: React.FC<IconProps> = ({ color = '#334155', size = 22 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'line', props: { x1: '4', x2: '20', y1: '12', y2: '12' } },
    { tag: 'line', props: { x1: '4', x2: '20', y1: '6', y2: '6' } },
    { tag: 'line', props: { x1: '4', x2: '20', y1: '18', y2: '18' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('menu', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerGridIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'rect', props: { width: '7', height: '7', x: '3', y: '3', rx: '1' } },
    { tag: 'rect', props: { width: '7', height: '7', x: '14', y: '3', rx: '1' } },
    { tag: 'rect', props: { width: '7', height: '7', x: '14', y: '14', rx: '1' } },
    { tag: 'rect', props: { width: '7', height: '7', x: '3', y: '14', rx: '1' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('grid', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerCalendarIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M8 2v4' } },
      { tag: 'path', props: { d: 'M16 2v4' } },
      { tag: 'rect', props: { width: '18', height: '18', x: '3', y: '4', rx: '2' } },
      { tag: 'path', props: { d: 'M3 10h18' } },
      { tag: 'path', props: { d: 'M8 14h.01' } },
      { tag: 'path', props: { d: 'M12 14h.01' } },
      { tag: 'path', props: { d: 'M16 14h.01' } },
      { tag: 'path', props: { d: 'M8 18h.01' } },
      { tag: 'path', props: { d: 'M12 18h.01' } },
      { tag: 'path', props: { d: 'M16 18h.01' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('calendar-days', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerUsersIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' } },
    { tag: 'circle', props: { cx: '9', cy: '7', r: '4' } },
    { tag: 'path', props: { d: 'M22 21v-2a4 4 0 0 0-3-3.87' } },
    { tag: 'path', props: { d: 'M16 3.13a4 4 0 0 1 0 7.75' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('users', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerCreditCardIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'rect', props: { width: '20', height: '14', x: '2', y: '5', rx: '2' } },
    { tag: 'line', props: { x1: '2', x2: '22', y1: '10', y2: '10' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('credit-card', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerVideoIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'm22 8-6 4 6 4V8Z' } },
    { tag: 'rect', props: { width: '14', height: '12', x: '2', y: '6', rx: '2' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('video', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerPillIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'm10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z' } },
      { tag: 'path', props: { d: 'm8.5 8.5 7 7' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.52,
          height: size * 0.9,
          borderRadius: size * 0.26,
          borderWidth: strokeWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <View style={{ width: '100%', height: strokeWidth, backgroundColor: color }} />
      </View>
    </View>
  );
};

export const WalletOutlineIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'path', props: { d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' } },
      { tag: 'path', props: { d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('wallet', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerFlaskIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'rect', props: { x: '8', y: '3', width: '8', height: '2', rx: '1' } },
    { tag: 'path', props: { d: 'M9 5v13a3 3 0 0 0 6 0V5' } },
    { tag: 'line', props: { x1: '12', y1: '11', x2: '15', y2: '11' } },
    { tag: 'line', props: { x1: '12', y1: '14', x2: '15', y2: '14' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('flask', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerBellIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' } },
    { tag: 'path', props: { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('bell', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const DrawerLogoutIcon: React.FC<IconProps> = ({ color = '#2dd4bf', size = 20 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' } },
    { tag: 'polyline', props: { points: '16 17 21 12 16 7' } },
    { tag: 'line', props: { x1: '21', x2: '9', y1: '12', y2: '12' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('logout', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const InPersonClinicIcon: React.FC<IconProps> = ({ color = '#0f766e', size = 16 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' } },
    { tag: 'path', props: { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' } },
    { tag: 'path', props: { d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' } },
    { tag: 'path', props: { d: 'M10 6h4' } },
    { tag: 'path', props: { d: 'M10 10h4' } },
    { tag: 'path', props: { d: 'M10 14h4' } },
    { tag: 'path', props: { d: 'M10 18h4' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.58,
          height: size * 0.85,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingVertical: 1,
        }}>
        <View style={{ width: '60%', height: 1.4, backgroundColor: color }} />
        <View style={{ width: '60%', height: 1.4, backgroundColor: color }} />
        <View style={{ width: '60%', height: 1.4, backgroundColor: color }} />
      </View>
    </View>
  );
};

export const VideoCallIcon: React.FC<IconProps> = ({ color = '#7c3aed', size = 16 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'm16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5' } },
    { tag: 'rect', props: { x: '2', y: '6', width: '14', height: '12', rx: '2' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
      <View
        style={{
          width: size * 0.65,
          height: size * 0.54,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: 3,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: 3.5,
          borderBottomWidth: 3.5,
          borderLeftWidth: 4.5,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: color,
          marginLeft: 1.5,
        }}
      />
    </View>
  );
};

export const RefreshCwIcon: React.FC<IconProps> = ({ color = '#0f172a', size = 15 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' } },
    { tag: 'path', props: { d: 'M21 3v5h-5' } },
    { tag: 'path', props: { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' } },
    { tag: 'path', props: { d: 'M8 16H3v5' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('refresh-cw', color) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const ShareLinkIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 14 }) => {
  const webSvg = renderWebSvg(size, color, [
    { tag: 'path', props: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' } },
    { tag: 'path', props: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' } },
  ]);
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.9, color, fontWeight: '700' }}>🔗</Text>
    </View>
  );
};

export const PhoneCallIcon: React.FC<IconProps> = ({ color = '#ffffff', size = 15, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      {
        tag: 'path',
        props: {
          d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
        },
      },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.9, lineHeight: size }}>📞</Text>
    </View>
  );
};

export const ClockOutlineIcon: React.FC<IconProps> = ({ color = '#b45309', size = 13, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'circle', props: { cx: '12', cy: '12', r: '10' } },
      { tag: 'polyline', props: { points: '12 6 12 12 16 14' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <Image
      source={{ uri: getIconPngUri('clock', color, strokeWidth) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export const AlertCircleIcon: React.FC<IconProps> = ({ color = '#f59e0b', size = 20, strokeWidth = 2 }) => {
  const webSvg = renderWebSvg(
    size,
    color,
    [
      { tag: 'circle', props: { cx: '12', cy: '12', r: '10' } },
      { tag: 'line', props: { x1: '12', y1: '8', x2: '12', y2: '12' } },
      { tag: 'line', props: { x1: '12', y1: '16', x2: '12.01', y2: '16' } },
    ],
    strokeWidth
  );
  if (webSvg) return webSvg;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color, fontSize: size * 0.65, fontWeight: '800', marginTop: -1 }}>!</Text>
    </View>
  );
};



const styles = StyleSheet.create({
  gridContainer: {
    justifyContent: 'space-between',
    padding: 1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridBox: {
    borderWidth: 1.8,
    borderRadius: 3,
  },
  calendarOuter: {
    borderWidth: 1.8,
    borderRadius: 5,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  calendarHeaderLine: {
    width: '100%',
    height: 4,
  },
  calendarBinderRow: {
    position: 'absolute',
    top: -2,
    flexDirection: 'row',
    width: '60%',
    justifyContent: 'space-between',
  },
  calendarBinderPin: {
    width: 2.5,
    height: 4,
    borderRadius: 1,
  },
  calendarDotGrid: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  calendarDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },
  userContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userHead: {
    borderWidth: 1.8,
    marginBottom: 1,
  },
  userBody: {
    borderWidth: 1.8,
    borderBottomWidth: 0,
  },
  cardOuter: {
    borderWidth: 1.8,
    borderRadius: 4,
    justifyContent: 'space-between',
    paddingTop: 3,
    paddingHorizontal: 2,
  },
  cardStripe: {
    width: '100%',
    height: 2.5,
  },
  cardChip: {
    width: 4,
    height: 3,
    borderWidth: 1,
    borderRadius: 1,
    marginBottom: 2,
    marginLeft: 2,
  },
  pillOuter: {
    borderWidth: 1.8,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-35deg' }],
  },
  pillDivider: {
    width: 1.8,
    height: '100%',
  },
  videoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBody: {
    borderWidth: 1.8,
    borderRadius: 4,
  },
  videoLens: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 1,
  },
  tubeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tubeTopCap: {
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  tubeBody: {
    width: 6,
    height: 13,
    borderWidth: 1.6,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  tubeLiquid: {
    width: '100%',
    height: '50%',
  },
  bellContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDome: {
    width: 12,
    height: 10,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bellRim: {
    width: 15,
    height: 2,
    borderRadius: 1,
  },
  bellClapper: {
    width: 4,
    height: 2.5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
