import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, removeToken } from './authStorage';

const DEV_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const BASE_URL = __DEV__ ? DEV_BASE : 'https://api.spltr.app';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
    }
    const data = error.response?.data;
    if (data?.error?.code) {
      return Promise.reject(
        new ApiError(data.error.code, data.error.message ?? 'Request failed'),
      );
    }
    return Promise.reject(
      new ApiError('NETWORK_ERROR', error.message ?? 'Network error'),
    );
  },
);

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export function unwrap(body) {
  if (!body || body.success === false) {
    const err = body?.error ?? {};
    throw new ApiError(err.code ?? 'ERROR', err.message ?? 'Request failed');
  }
  return body.data;
}

export const authApi = {
  sendOtp: (phone) => client.post('/auth/send-otp', { phone }),

  verifyOtp: (phone, code, firstName) =>
    client.post('/auth/verify-otp', { phone, code, first_name: firstName }),

  getMe: () => client.get('/auth/me'),

  logout: () => client.post('/auth/logout'),
};

export default client;
