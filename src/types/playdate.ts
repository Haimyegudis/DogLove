export interface PlaydateRow {
  id: string;
  starts_at: string;
  location_name: string | null;
  status: string;
  other_name: string | null;
  other_photo: string | null;
  is_organizer: boolean;
}
