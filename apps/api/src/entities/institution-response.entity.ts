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
import { Authority } from "./authority.entity.js";
import { Mandate } from "./mandate.entity.js";

@Entity({ name: "institution_responses" })
@Index(["mandateId", "createdAt"])
export class InstitutionResponse {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Mandate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mandate_id" })
  mandate!: Mandate;

  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;

  @ManyToOne(() => Authority, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "authority_id" })
  authority?: Authority | null;

  @Column({ name: "authority_id", type: "uuid", nullable: true })
  authorityId?: string | null;

  // Free-form label for the responder (e.g., "County Water Office").
  // Real identity stays out of the public surface in the MVP.
  @Column({ name: "responder_label", type: "varchar" })
  responderLabel!: string;

  @Column({ name: "response_text", type: "text" })
  responseText!: string;

  @Column({ name: "new_status", type: "varchar", nullable: true })
  newStatus?: MandateStatus | null;

  @Column({ name: "expected_resolution_date", type: "date", nullable: true })
  expectedResolutionDate?: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
