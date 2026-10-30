import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelationConversion1712319443154 implements MigrationInterface {
  name = 'RelationConversion1712319443154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumpster_refused_mmr" ADD CONSTRAINT "FK_89ff97a5a47d4f4f9c969fca39c" FOREIGN KEY ("jobSiteId") REFERENCES "job_site"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dumpster_refused_mmr" DROP CONSTRAINT "FK_89ff97a5a47d4f4f9c969fca39c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "isRead" SET DEFAULT false`,
    );
  }
}
