import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('veterinarians')
export class VetEntity {
  @PrimaryGeneratedColumn({ name: 'vet_id' })
  id!: number;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({ type: 'varchar', nullable: true })
  street?: string | null;

  @Column({ name: 'house_number', type: 'varchar', nullable: true })
  houseNumber?: string | null;

  @Column({ name: 'postal_code', type: 'varchar', nullable: true })
  postalCode?: string | null;

  @Column({ type: 'varchar', nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', nullable: true })
  country?: string | null;

  @Column({ name: 'phone_country_code', type: 'varchar', nullable: true })
  phoneCountryCode?: string | null;

  @Column({ name: 'phone_number', type: 'varchar' })
  phone!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  specialization?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
