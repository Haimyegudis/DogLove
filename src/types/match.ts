export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface BrowseDog {
  dog_id: string;
  name: string;
  breed: string;
  age: number;
  photo_url: string;
  owner_id: string;
  owner_name: string | null;
  city?: string | null;
}

export interface PlaydateRequestRow {
  request_id: string;
  status: RequestStatus;
  created_at: string;
  dog_id: string;
  dog_name: string;
  dog_breed: string;
  dog_photo: string;
  owner_name: string | null;
}
