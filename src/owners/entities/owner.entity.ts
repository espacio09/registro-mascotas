import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity'; // ✅ FIX: ruta correcta al importar Pet

@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn()
  owner_id!: number;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @OneToMany(() => Pet, (pet) => pet.owner) // 🔥 FIX: relación correcta con Pet
  pets!: Pet[];
}
