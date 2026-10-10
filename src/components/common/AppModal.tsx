import React from 'react';
import { Modal as NativeModal, ModalProps, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { appToastConfig } from './AppToast';

/**
 * Keeps toast messages above native modal windows. The toast host is mounted
 * only while the modal is visible so Toast.show targets the topmost host.
 */
export function AppModal({ children, visible = false, ...props }: ModalProps) {
  return (
    <NativeModal {...props} visible={visible}>
      <>
        {children}
        {visible ? (
          <View pointerEvents="box-none" style={styles.toastLayer}>
            <Toast config={appToastConfig} />
          </View>
        ) : null}
      </>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  toastLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    elevation: 10000,
  },
});
