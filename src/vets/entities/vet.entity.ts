import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class VetEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  address!: string;

  @Column()
  phonenumber!: string;

  @Column({ nullable: true })
  email?: string;
}
