import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * One row per (mandate, citizen). The unique index enforces "one upvote per
 * citizen per mandate" so the toggle endpoint can safely upsert/delete.
 */
@Entity({ name: "mandate_upvotes" })
@Index(["mandateId", "citizenId"], { unique: true })
@Index(["citizenId"])
export class MandateUpvote {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "mandate_id", type: "varchar" })
  mandateId!: string;

  @Column({ name: "citizen_id", type: "varchar" })
  citizenId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
