import React from 'react';
import { StyleSheet, View } from 'react-native';

interface IconProps {
  color?: string;
  size?: number;
}

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

export const CalendarIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  return (
    <View style={[styles.calendarOuter, { width: size, height: size, borderColor: color }]}>
      <View style={[styles.calendarHeaderLine, { backgroundColor: color }]} />
      <View style={styles.calendarBinderRow}>
        <View style={[styles.calendarBinderPin, { backgroundColor: color }]} />
        <View style={[styles.calendarBinderPin, { backgroundColor: color }]} />
      </View>
      <View style={styles.calendarDotGrid}>
        <View style={[styles.calendarDot, { backgroundColor: color }]} />
        <View style={[styles.calendarDot, { backgroundColor: color }]} />
      </View>
    </View>
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

export const BillingCardIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  return (
    <View style={[styles.cardOuter, { width: size, height: size * 0.75, borderColor: color }]}>
      <View style={[styles.cardStripe, { backgroundColor: color }]} />
      <View style={[styles.cardChip, { borderColor: color }]} />
    </View>
  );
};

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

export const LabTubeIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  return (
    <View style={[styles.tubeContainer, { width: size, height: size }]}>
      <View style={[styles.tubeTopCap, { backgroundColor: color }]} />
      <View style={[styles.tubeBody, { borderColor: color }]}>
        <View style={[styles.tubeLiquid, { backgroundColor: color }]} />
      </View>
    </View>
  );
};

export const BellNotificationIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20 }) => {
  return (
    <View style={[styles.bellContainer, { width: size, height: size }]}>
      <View style={[styles.bellDome, { borderColor: color }]} />
      <View style={[styles.bellRim, { backgroundColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
    </View>
  );
};

export const ViewDetailsIcon: React.FC<IconProps> = ({ color = '#334155', size = 18 }) => {
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

export const StethoscopeIcon: React.FC<IconProps> = ({ color = '#334155', size = 18 }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.65,
          height: size * 0.55,
          borderWidth: 1.8,
          borderColor: color,
          borderTopWidth: 0,
          borderBottomLeftRadius: size * 0.3,
          borderBottomRightRadius: size * 0.3,
        }}
      />
      <View
        style={{
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: size * 0.125,
          borderWidth: 1.8,
          borderColor: color,
          marginTop: 1,
        }}
      />
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
