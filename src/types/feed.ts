export interface FeedPost {
  post_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  owner_id: string;
  owner_name: string | null;
  owner_photo: string | null;
  dog_name: string | null;
  reaction_count: number;
  my_reaction: string | null;
  distance_m?: number | null;
}
