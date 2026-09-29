import { router } from 'expo-router';
import { ServerForm } from '@/components/ServerForm';

/** Reached from the "Server" link on the Log in screen. */
export default function ServerScreen() {
  return <ServerForm onBack={() => router.back()} onSaved={() => router.back()} />;
}
