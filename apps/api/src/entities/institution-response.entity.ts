import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { MandateStatus } from "@sautiledger/shared";
import { Mandate } from "./mandate.entity.js";

@Entity({ name: "institution_responses" })
@Index(["mandateId", "createdAt"])
export class InstitutionResponse {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Mandate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mandate_id" })
  mandate!: Mandate;

  @Column({ name: "mandate_id", type: "varchar" })
  mandateId!: string;

  // Free-form label for the responder (e.g., "Mathare Constituency Office").
  @Column({ name: "responder_label", type: "varchar" })
  responderLabel!: string;

  @Column({ name: "response_text", type: "text" })
  responseText!: string;

  @Column({ name: "new_status", type: "varchar", nullable: true })
  newStatus?: MandateStatus | null;

  @Column({ name: "expected_resolution_date", type: "datetime", nullable: true })
  expectedResolutionDate?: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
