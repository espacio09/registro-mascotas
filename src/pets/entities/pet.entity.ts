import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Owner } from '.../owners/entities/owner.entity';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  age!: number;

  @Column()
  type!: string;

  @Column({ nullable: true })
  breed?: string;

  @ManyToOne(() => Owner, (owner: { pets: any; }) => owner.pets)
  owner!: Owner;
}
