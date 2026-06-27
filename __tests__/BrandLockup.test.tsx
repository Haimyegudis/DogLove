import { render } from '@testing-library/react-native';
import BrandLockup from '../src/components/BrandLockup';

test('renders both parts of the brand name', async () => {
  const { getByText, getByTestId } = await render(<BrandLockup />);
  expect(getByTestId('brand-lockup')).toBeTruthy();
  expect(getByText('כלב')).toBeTruthy();
  expect(getByText('LOVE')).toBeTruthy();
});
