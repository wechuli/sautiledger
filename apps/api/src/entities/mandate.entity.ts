import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  MandateCategory,
  MandateStatus,
  Urgency,
} from "@sautiledger/shared";
import { Authority } from "./authority.entity.js";

@Entity({ name: "mandates" })
@Index(["category", "county", "status"])
@Index(["lastActivityAt"])
export class Mandate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "text" })
  summary!: string;

  @Column({ name: "formal_mandate_text", type: "text" })
  formalMandateText!: string;

  @Column({ type: "varchar" })
  category!: MandateCategory;

  @Column({ type: "varchar" })
  urgency!: Urgency;

  @Column({ type: "varchar", default: "new" })
  status!: MandateStatus;

  @ManyToOne(() => Authority, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "authority_id" })
  authority?: Authority | null;

  @Column({ name: "authority_id", type: "uuid", nullable: true })
  authorityId?: string | null;

  @Column({ type: "varchar", nullable: true })
  county?: string | null;

  @Column({ type: "varchar", nullable: true })
  constituency?: string | null;

  @Column({ type: "varchar", nullable: true })
  ward?: string | null;

  @Column({ name: "submission_count", type: "int", default: 1 })
  submissionCount!: number;

  // 0..1 — log-scaled by submissionCount and confidence diversity.
  @Column({ name: "evidence_strength", type: "double precision", default: 0 })
  evidenceStrength!: number;

  @Column({ name: "first_reported_at", type: "timestamptz" })
  firstReportedAt!: Date;

  @Column({ name: "last_activity_at", type: "timestamptz" })
  lastActivityAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
