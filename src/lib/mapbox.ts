import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';

export function initMapbox() {
  const token = (Constants.expoConfig?.extra as { mapboxPublicToken?: string } | undefined)?.mapboxPublicToken;
  if (token) Mapbox.setAccessToken(token);
}
