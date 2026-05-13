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

@Entity({ name: "mandate_status_history" })
@Index(["mandateId", "createdAt"])
export class StatusHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Mandate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mandate_id" })
  mandate!: Mandate;

  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;

  @Column({ name: "old_status", type: "varchar", nullable: true })
  oldStatus?: MandateStatus | null;

  @Column({ name: "new_status", type: "varchar" })
  newStatus!: MandateStatus;

  @Column({ name: "changed_by_label", type: "varchar" })
  changedByLabel!: string;

  @Column({ type: "text", nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
