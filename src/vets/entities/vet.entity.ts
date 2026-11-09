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

  @Column({ type: 'varchar', nullable: true })
  address?: string | null;

  @Column({ name: 'phone', type: 'varchar' })
  phone!: string;

  @Column({ type: 'varchar' })
  email!: string;
}
