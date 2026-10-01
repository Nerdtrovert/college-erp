import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'User_role_academic_fields_check'
      ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_role_academic_fields_check"
        CHECK (
          ("role" = 'student' AND "department" IS NULL)
          OR
          ("role" <> 'student' AND "program" IS NULL AND "classGroup" IS NULL)
        );
      END IF;
    END
    $$;
  `);
  console.log('Role-specific field constraint ensured.');
}

main()
  .catch((error) => {
    console.error('Failed to ensure role-specific field constraint:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
