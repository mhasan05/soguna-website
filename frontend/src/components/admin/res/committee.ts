export interface Term {
  id: number;
  name: string;
  start_date: string;
  is_current: boolean;
}
export interface Position {
  id: number;
  term: number;
  title: string;
  member: number | null;
  member_name: string | null;
  person_name: string;
  para_name: string;
  order: number;
  is_advisor: boolean;
  show_phone: boolean;
}
