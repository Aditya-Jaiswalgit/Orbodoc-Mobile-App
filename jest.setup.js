/* eslint-disable no-undef */
const mockStore = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key, val) => {
    mockStore.set(key, val);
  }),
  getItem: jest.fn(async (key) => {
    return mockStore.get(key) ?? null;
  }),
  removeItem: jest.fn(async (key) => {
    mockStore.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStore.clear();
  }),
  getAllKeys: jest.fn(async () => Array.from(mockStore.keys())),
}));

// These native bridges are exercised on-device; the suite only needs their
// import surfaces while testing screen and business behavior.
jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));

jest.mock('react-native-blob-util', () => {
  const bridge = {
    fs: { dirs: { CacheDir: '', DownloadDir: '', DocumentDir: '' } },
    config: jest.fn(() => ({ fetch: jest.fn() })),
    android: { actionViewIntent: jest.fn() },
    ios: { openDocument: jest.fn() },
  };
  return { __esModule: true, default: bridge };
});

jest.mock('react-native-webrtc', () => ({
  mediaDevices: { getUserMedia: jest.fn() },
  RTCIceCandidate: jest.fn(),
  RTCPeerConnection: jest.fn(),
  RTCSessionDescription: jest.fn(),
  RTCView: 'RTCView',
  MediaStream: jest.fn(),
}));
