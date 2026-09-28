import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';

/** Entry point: sends the user to the step of the journey they are on. */
export default function Index() {
  const { account } = useAuth();
  if (!account) return <Redirect href="/login" />;
  if (!account.profileComplete) return <Redirect href="/profile" />;
  if (!account.hasSelectedTasks) return <Redirect href="/tasks" />;
  return <Redirect href="/home" />;
}
