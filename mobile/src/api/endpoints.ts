import { request } from './client';
import type { Account, Category, LoginResponse, OtpSent, ProfileInput } from './types';

export const api = {
  register: (email: string, password: string) => request<OtpSent>('POST', '/auth/register', { email, password }),
  verifyEmail: (email: string, code: string) =>
    request<{ email: string; verified: true }>('POST', '/auth/verify-email', { email, code }),
  resendOtp: (email: string) => request<OtpSent>('POST', '/auth/resend-otp', { email }),
  login: (email: string, password: string) => request<LoginResponse>('POST', '/auth/login', { email, password }),

  me: () => request<{ user: Account }>('GET', '/me').then((r) => r.user),
  saveProfile: (input: ProfileInput) => request<{ user: Account }>('PUT', '/me/profile', input).then((r) => r.user),

  catalogue: () => request<{ categories: Category[] }>('GET', '/tasks').then((r) => r.categories),
  myTasks: () => request<{ categories: Category[] }>('GET', '/me/tasks').then((r) => r.categories),
  saveMyTasks: (taskIds: string[]) =>
    request<{ categories: Category[] }>('PUT', '/me/tasks', { taskIds }).then((r) => r.categories),

  health: () => request<{ status: string }>('GET', '/health'),
};
