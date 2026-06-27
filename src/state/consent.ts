import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'doglove.dataNoticeSeen.v1';

export async function hasSeenDataNotice(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === 'true';
}

export async function setDataNoticeSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
