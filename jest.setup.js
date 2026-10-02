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
