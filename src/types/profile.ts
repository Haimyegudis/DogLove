export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type DogSize = 'S' | 'M' | 'L';

export interface OwnerProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  date_of_birth: string | null; // ISO YYYY-MM-DD
  gender: Gender | null;
  bio: string | null;
}

export interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age: number;
  size: DogSize | null;
  photo_url: string;
  bio: string | null;
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'נקבה' },
  { value: 'male', label: 'זכר' },
  { value: 'other', label: 'אחר' },
  { value: 'prefer_not_to_say', label: 'מעדיף/ה לא לומר' },
];

export const SIZE_OPTIONS: { value: DogSize; label: string }[] = [
  { value: 'S', label: 'קטן' },
  { value: 'M', label: 'בינוני' },
  { value: 'L', label: 'גדול' },
];
