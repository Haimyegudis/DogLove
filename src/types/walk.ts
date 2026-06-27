export interface Coords {
  lat: number;
  lng: number;
}

export interface NearbyDog {
  dog_id: string;
  name: string;
  breed: string;
  photo_url: string;
  lat: number;
  lng: number;
  distance_m: number;
}
