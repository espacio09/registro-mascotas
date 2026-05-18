import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}
