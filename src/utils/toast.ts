import Toast from 'react-native-toast-message';

// Wait for native modal dismissals and screen transitions to finish before
// asking the root Toast host to render. A React Native Modal can cover a root
// toast while its dismissal animation is still running.
const showToastAfterTransition = (options: Parameters<typeof Toast.show>[0]) => {
  setTimeout(() => Toast.show(options), 500);
};

export const showSuccessToast = (title: string, message?: string) => {
  showToastAfterTransition({
    type: 'success',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3500,
    topOffset: 50,
  });
};

export const showErrorToast = (title: string, message?: string) => {
  showToastAfterTransition({
    type: 'error',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    topOffset: 50,
  });
};

export const showInfoToast = (title: string, message?: string) => {
  showToastAfterTransition({
    type: 'info',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3500,
    topOffset: 50,
  });
};
