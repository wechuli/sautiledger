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
  AiProcessingResult,
  CivicLocation,
  MandateCategory,
  ScopeLevel,
  SubmissionProcessingStatus,
  Urgency,
} from "@sautiledger/shared";
import { Citizen } from "./citizen.entity.js";
import { Mandate } from "./mandate.entity.js";

@Entity({ name: "submissions" })
export class Submission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ name: "tracking_code", type: "varchar" })
  trackingCode!: string;

  @ManyToOne(() => Citizen, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "citizen_id" })
  citizen?: Citizen | null;

  @Index()
  @Column({ name: "citizen_id", type: "varchar", nullable: true })
  citizenId?: string | null;

  @ManyToOne(() => Mandate, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "mandate_id" })
  mandate?: Mandate | null;

  @Index()
  @Column({ name: "mandate_id", type: "varchar", nullable: true })
  mandateId?: string | null;

  @Column({ name: "original_text", type: "text" })
  originalText!: string;

  @Column({ name: "normalized_text", type: "text", nullable: true })
  normalizedText?: string | null;

  @Column({ name: "detected_language", type: "varchar", nullable: true })
  detectedLanguage?: string | null;

  @Column({ type: "varchar", nullable: true })
  category?: MandateCategory | null;

  @Column({ type: "varchar", nullable: true })
  urgency?: Urgency | null;

  // The administrative scope the citizen targeted with the submission.
  @Column({ name: "scope_level", type: "varchar" })
  scopeLevel!: ScopeLevel;

  @Column({ name: "processing_status", type: "varchar", default: "pending" })
  processingStatus!: SubmissionProcessingStatus;

  // Legacy: previously stored a contact identifier hash. Kept nullable for
  // back-compat. Phone hashing now lives on the Citizen.
  @Column({ name: "contact_hash", type: "varchar", nullable: true })
  contactHash?: string | null;

  @Column({ type: "simple-json" })
  location!: CivicLocation;

  // Raw AI payload for debugging/audit. Extracted fields above are indexed.
  @Column({ name: "ai_result", type: "simple-json", nullable: true })
  aiResult?: AiProcessingResult | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
