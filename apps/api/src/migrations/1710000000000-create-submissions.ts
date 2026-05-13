import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSubmissions1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.createTable(
      new Table({
        name: "submissions",
        columns: [
          { name: "id", type: "uuid", isPrimary: true, generationStrategy: "uuid", default: "gen_random_uuid()" },
          { name: "tracking_code", type: "varchar", isUnique: true },
          { name: "original_text", type: "text" },
          { name: "contact_hash", type: "varchar", isNullable: true },
          { name: "location", type: "jsonb" },
          { name: "ai_result", type: "jsonb" },
          { name: "created_at", type: "timestamptz", default: "now()" }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("submissions");
  }
}
