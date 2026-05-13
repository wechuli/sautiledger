import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { AuthorityLevel } from "@sautiledger/shared";

@Entity({ name: "authorities" })
@Index(["level", "county"])
export class Authority {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  level!: AuthorityLevel;

  @Column({ type: "varchar", nullable: true })
  county?: string | null;

  @Column({ type: "varchar", nullable: true })
  constituency?: string | null;

  @Column({ type: "varchar", nullable: true })
  ward?: string | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "contact_email", type: "varchar", nullable: true })
  contactEmail?: string | null;

  @Column({ type: "boolean", default: false })
  verified!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
