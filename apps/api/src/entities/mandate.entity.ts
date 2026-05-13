import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  MandateCategory,
  MandateStatus,
  ScopeLevel,
  Urgency,
} from "@sautiledger/shared";

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

  // The administrative scope this mandate is addressed to.
  @Column({ name: "scope_level", type: "varchar" })
  scopeLevel!: ScopeLevel;

  // Cached human-readable label for the responsible office. Derived from
  // scopeLevel + location at submission time and refreshed on response.
  @Column({ name: "responsible_office", type: "varchar" })
  responsibleOffice!: string;

  @Column({ type: "varchar", nullable: true })
  county?: string | null;

  @Column({ type: "varchar", nullable: true })
  constituency?: string | null;

  @Column({ type: "varchar", nullable: true })
  ward?: string | null;

  @Column({ name: "submission_count", type: "int", default: 1 })
  submissionCount!: number;

  // 0..1 — log-scaled by submissionCount and confidence diversity.
  @Column({ name: "evidence_strength", type: "real", default: 0 })
  evidenceStrength!: number;

  @Column({ name: "first_reported_at", type: "datetime" })
  firstReportedAt!: Date;

  @Column({ name: "last_activity_at", type: "datetime" })
  lastActivityAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
