export interface Walker {
  user_id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  avg_stars: number;
  rating_count: number;
}
