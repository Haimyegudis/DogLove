import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../src/services/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: 'u1', app_metadata: { provider: 'email' } } }),
  onAuthStateChange: jest.fn(() => ({ unsubscribe: jest.fn() })),
  signOut: jest.fn(),
}));
jest.mock('../src/services/profile', () => ({ ensureProfile: jest.fn().mockResolvedValue({ error: null }) }));
jest.mock('../src/services/push', () => ({ registerForPush: jest.fn() }));

import { AuthProvider, useAuth } from '../src/state/AuthContext';

function Probe() {
  const { session, loading } = useAuth();
  return <Text>{loading ? 'loading' : session ? 'in' : 'out'}</Text>;
}

test('loads session and exposes signed-in state', async () => {
  const { getByText } = await render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(getByText('in')).toBeTruthy());
});
