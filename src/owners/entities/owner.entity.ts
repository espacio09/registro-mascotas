import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pet } from '../pets/entities/pet.entity.ts';

@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  email!: string;

  @OneToMany(() => Pet, (pet) => pet.owner)
  pets!: Pet[];
}