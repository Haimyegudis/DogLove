export type HealthKind = 'vaccine'|'vet'|'weight'|'med'|'note';

export interface HealthRecord {
  id: string;
  dog_id: string;
  kind: HealthKind;
  label: string;
  event_date: string|null;
  notes: string|null;
  created_at: string;
}

export const HEALTH_KINDS: {value:HealthKind,label:string}[] = [
  {value:'vaccine',label:'חיסון'},
  {value:'vet',label:'וטרינר'},
  {value:'weight',label:'משקל'},
  {value:'med',label:'תרופה'},
  {value:'note',label:'הערה'},
];
