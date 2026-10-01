export interface Owner {
  owner_id: number;
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  phone: string;

  notes?: string | null;
}
