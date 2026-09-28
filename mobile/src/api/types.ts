/** Mirrors the backend responses (see backend/API.md). */

export interface Profile {
  name: string;
  mobile: string;
  address: string;
  businessName: string | null;
}

export interface Account {
  id: string;
  email: string;
  emailVerified: boolean;
  profileComplete: boolean;
  hasSelectedTasks: boolean;
  profile: Profile | null;
}

export interface Task {
  id: string;
  name: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  /** Feather icon name */
  icon: string;
  tasks: Task[];
}

export interface OtpSent {
  email: string;
  retryAfterSec: number;
}

export interface LoginResponse {
  token: string;
  user: Account;
}

export interface ProfileInput {
  name: string;
  mobile: string;
  address: string;
  businessName?: string | null;
}
