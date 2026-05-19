import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Owner } from '../../owners/entities/owner.entity';

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

  @ManyToOne(() => Owner, (owner) => owner.pets)
  @JoinColumn({ name: 'owner_id' }) // 🔥 CLAVE
  owner!: Owner;
}
