import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "citizens" })
export class Citizen {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // SHA-256(SUBMISSION_HASH_SALT + ":" + e164-phone). Never store raw phone.
  @Index({ unique: true })
  @Column({ name: "phone_hash", type: "varchar" })
  phoneHash!: string;

  // bcrypt(password) — cost 12.
  @Column({ name: "password_hash", type: "varchar" })
  passwordHash!: string;

  @Column({ name: "county_hint", type: "varchar", nullable: true })
  countyHint?: string | null;

  @Column({ name: "last_login_at", type: "datetime", nullable: true })
  lastLoginAt?: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
