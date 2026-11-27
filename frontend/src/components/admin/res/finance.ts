export interface Entry {
  id: string;
  kind: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  description: string;
  event: string | null;
  aid_request: number | null;
  voucher: string | null;
  created_by: string | null;
  is_void: boolean;
  void_reason: string;
}
