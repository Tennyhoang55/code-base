-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('ACCOUNT', 'PARTICIPANT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "identityType" "IdentityType" NOT NULL DEFAULT 'ACCOUNT',
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Public self-declared profiles can never acquire account credentials or admin access.
ALTER TABLE "User" ADD CONSTRAINT "User_participant_identity_check" CHECK (
  "identityType" <> 'PARTICIPANT' OR (
    "role" = 'EMPLOYEE' AND "passwordHash" IS NULL AND NOT "mustChangePassword"
    AND "birthDate" IS NOT NULL AND "department" IS NOT NULL
    AND "department" IN ('Sales', 'CS', 'OPS', 'Thực tập sinh')
  )
);
ALTER TABLE "User" ADD CONSTRAINT "User_admin_identity_check" CHECK (
  "role" <> 'ADMIN' OR ("identityType" = 'ACCOUNT' AND "passwordHash" IS NOT NULL)
);
