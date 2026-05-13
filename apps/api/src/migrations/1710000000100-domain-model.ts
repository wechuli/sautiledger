import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

/**
 * Adds the rest of the domain model on top of the initial `submissions` table:
 *   - citizens (phone-hash + bcrypt password)
 *   - authorities (Kenyan institutions, optionally scoped to county/ward)
 *   - mandates (clustered community priorities)
 *   - institution_responses
 *   - mandate_status_history
 *
 * Also extends `submissions` with citizen_id, target_authority_id, mandate_id,
 * normalized_text, detected_language, category, urgency, processing_status,
 * and updated_at.
 */
export class DomainModel1710000000100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------- citizens ---------------------------------
    await queryRunner.createTable(
      new Table({
        name: "citizens",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          { name: "phone_hash", type: "varchar", isUnique: true },
          { name: "password_hash", type: "varchar" },
          { name: "county_hint", type: "varchar", isNullable: true },
          { name: "last_login_at", type: "timestamptz", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
      }),
    );

    // -------------------------- authorities ------------------------------
    await queryRunner.createTable(
      new Table({
        name: "authorities",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          { name: "name", type: "varchar" },
          { name: "level", type: "varchar" },
          { name: "county", type: "varchar", isNullable: true },
          { name: "constituency", type: "varchar", isNullable: true },
          { name: "ward", type: "varchar", isNullable: true },
          { name: "description", type: "text", isNullable: true },
          { name: "contact_email", type: "varchar", isNullable: true },
          { name: "verified", type: "boolean", default: false },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
      }),
    );
    await queryRunner.createIndex(
      "authorities",
      new TableIndex({
        name: "idx_authorities_level_county",
        columnNames: ["level", "county"],
      }),
    );

    // -------------------------- mandates ---------------------------------
    await queryRunner.createTable(
      new Table({
        name: "mandates",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          { name: "title", type: "varchar" },
          { name: "summary", type: "text" },
          { name: "formal_mandate_text", type: "text" },
          { name: "category", type: "varchar" },
          { name: "urgency", type: "varchar" },
          { name: "status", type: "varchar", default: "'new'" },
          { name: "authority_id", type: "uuid", isNullable: true },
          { name: "county", type: "varchar", isNullable: true },
          { name: "constituency", type: "varchar", isNullable: true },
          { name: "ward", type: "varchar", isNullable: true },
          { name: "submission_count", type: "int", default: 1 },
          { name: "evidence_strength", type: "double precision", default: 0 },
          { name: "first_reported_at", type: "timestamptz" },
          { name: "last_activity_at", type: "timestamptz" },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      "mandates",
      new TableForeignKey({
        columnNames: ["authority_id"],
        referencedTableName: "authorities",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createIndex(
      "mandates",
      new TableIndex({
        name: "idx_mandates_category_county_status",
        columnNames: ["category", "county", "status"],
      }),
    );
    await queryRunner.createIndex(
      "mandates",
      new TableIndex({
        name: "idx_mandates_last_activity_at",
        columnNames: ["last_activity_at"],
      }),
    );

    // -------------------------- institution_responses --------------------
    await queryRunner.createTable(
      new Table({
        name: "institution_responses",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          { name: "mandate_id", type: "uuid" },
          { name: "authority_id", type: "uuid", isNullable: true },
          { name: "responder_label", type: "varchar" },
          { name: "response_text", type: "text" },
          { name: "new_status", type: "varchar", isNullable: true },
          { name: "expected_resolution_date", type: "date", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      "institution_responses",
      new TableForeignKey({
        columnNames: ["mandate_id"],
        referencedTableName: "mandates",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
    await queryRunner.createForeignKey(
      "institution_responses",
      new TableForeignKey({
        columnNames: ["authority_id"],
        referencedTableName: "authorities",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createIndex(
      "institution_responses",
      new TableIndex({
        name: "idx_institution_responses_mandate_created",
        columnNames: ["mandate_id", "created_at"],
      }),
    );

    // -------------------------- mandate_status_history -------------------
    await queryRunner.createTable(
      new Table({
        name: "mandate_status_history",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          { name: "mandate_id", type: "uuid" },
          { name: "old_status", type: "varchar", isNullable: true },
          { name: "new_status", type: "varchar" },
          { name: "changed_by_label", type: "varchar" },
          { name: "note", type: "text", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      "mandate_status_history",
      new TableForeignKey({
        columnNames: ["mandate_id"],
        referencedTableName: "mandates",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
    await queryRunner.createIndex(
      "mandate_status_history",
      new TableIndex({
        name: "idx_status_history_mandate_created",
        columnNames: ["mandate_id", "created_at"],
      }),
    );

    // -------------------------- submissions: extend ----------------------
    await queryRunner.query(`
      ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS citizen_id uuid NULL,
        ADD COLUMN IF NOT EXISTS target_authority_id uuid NULL,
        ADD COLUMN IF NOT EXISTS mandate_id uuid NULL,
        ADD COLUMN IF NOT EXISTS normalized_text text NULL,
        ADD COLUMN IF NOT EXISTS detected_language varchar NULL,
        ADD COLUMN IF NOT EXISTS category varchar NULL,
        ADD COLUMN IF NOT EXISTS urgency varchar NULL,
        ADD COLUMN IF NOT EXISTS processing_status varchar NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
    `);
    // ai_result was NOT NULL in the initial migration; relax it now that
    // submissions may exist in a `pending` state without an AI payload.
    await queryRunner.query(
      `ALTER TABLE submissions ALTER COLUMN ai_result DROP NOT NULL`,
    );

    await queryRunner.createForeignKey(
      "submissions",
      new TableForeignKey({
        columnNames: ["citizen_id"],
        referencedTableName: "citizens",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createForeignKey(
      "submissions",
      new TableForeignKey({
        columnNames: ["target_authority_id"],
        referencedTableName: "authorities",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createForeignKey(
      "submissions",
      new TableForeignKey({
        columnNames: ["mandate_id"],
        referencedTableName: "mandates",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createIndex(
      "submissions",
      new TableIndex({
        name: "idx_submissions_citizen_id",
        columnNames: ["citizen_id"],
      }),
    );
    await queryRunner.createIndex(
      "submissions",
      new TableIndex({
        name: "idx_submissions_mandate_id",
        columnNames: ["mandate_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order to respect FKs.
    const submissionsTable = await queryRunner.getTable("submissions");
    if (submissionsTable) {
      for (const fk of submissionsTable.foreignKeys) {
        if (
          fk.columnNames.includes("citizen_id") ||
          fk.columnNames.includes("target_authority_id") ||
          fk.columnNames.includes("mandate_id")
        ) {
          await queryRunner.dropForeignKey("submissions", fk);
        }
      }
    }
    await queryRunner.dropIndex("submissions", "idx_submissions_citizen_id");
    await queryRunner.dropIndex("submissions", "idx_submissions_mandate_id");
    await queryRunner.query(`
      ALTER TABLE submissions
        DROP COLUMN IF EXISTS citizen_id,
        DROP COLUMN IF EXISTS target_authority_id,
        DROP COLUMN IF EXISTS mandate_id,
        DROP COLUMN IF EXISTS normalized_text,
        DROP COLUMN IF EXISTS detected_language,
        DROP COLUMN IF EXISTS category,
        DROP COLUMN IF EXISTS urgency,
        DROP COLUMN IF EXISTS processing_status,
        DROP COLUMN IF EXISTS updated_at
    `);

    await queryRunner.dropTable("mandate_status_history");
    await queryRunner.dropTable("institution_responses");
    await queryRunner.dropTable("mandates");
    await queryRunner.dropTable("authorities");
    await queryRunner.dropTable("citizens");
  }
}
