export interface Pet {
  pet_name: string;
  pet_type_id: number;
  breed_id: number;
  birth_date: Date;
  microchip_no: number;
  owner_id: number;
  ownerId: number;
  owner_name?: string;
  owner_birthdate?: Date;
  breed_name?: string;
}
