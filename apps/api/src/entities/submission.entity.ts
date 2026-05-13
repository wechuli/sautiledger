import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { AiProcessingResult, CivicLocation } from "@sautiledger/shared";

@Entity({ name: "submissions" })
export class Submission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "tracking_code", unique: true })
  trackingCode!: string;

  @Column({ name: "original_text", type: "text" })
  originalText!: string;

  @Column({ name: "contact_hash", nullable: true })
  contactHash?: string;

  @Column({ type: "jsonb" })
  location!: CivicLocation;

  @Column({ name: "ai_result", type: "jsonb" })
  aiResult!: AiProcessingResult;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
