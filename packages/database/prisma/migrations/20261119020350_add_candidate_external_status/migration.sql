-- CreateEnum
CREATE TYPE "CandidateExternalStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable: SUCCESS = "Thành công", FAILED = "Thất bại"; NULL until a result is set.
ALTER TABLE "candidates" ADD COLUMN "externalstatus" "CandidateExternalStatus";
