-- CreateEnum
CREATE TYPE "Role" AS ENUM ('POS_OPERATOR', 'COLLECTIONS', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'PAID', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'PENDING', 'RELEASED');

-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('UNLOCKED', 'LOCK_PENDING', 'LOCKED', 'UNLOCK_PENDING');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('LOCK', 'UNLOCK', 'LOCATE', 'SOUND', 'REMOVE_MGMT');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'ERROR');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOCK', 'UNLOCK', 'LOCATE', 'SOUND', 'ENROLL', 'RELEASE', 'USER_CREATE', 'USER_DISABLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLLECTIONS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "doc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanContract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "monthly" INTEGER NOT NULL,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "nextPaymentDate" TIMESTAMP(3),
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "ios" TEXT NOT NULL,
    "supervised" BOOLEAN NOT NULL DEFAULT true,
    "enrollmentStatus" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "lockStatus" "LockStatus" NOT NULL DEFAULT 'UNLOCKED',
    "lastSeenAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MdmCommand" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" "CommandType" NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "providerCommandId" TEXT,
    "provider" TEXT NOT NULL,
    "payload" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastTriedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MdmCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "deviceId" TEXT,
    "contractId" TEXT,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_fullName_idx" ON "Customer"("fullName");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "LoanContract_number_key" ON "LoanContract"("number");

-- CreateIndex
CREATE INDEX "LoanContract_status_idx" ON "LoanContract"("status");

-- CreateIndex
CREATE INDEX "LoanContract_customerId_idx" ON "LoanContract"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serial_key" ON "Device"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "Device_imei_key" ON "Device"("imei");

-- CreateIndex
CREATE INDEX "Device_lockStatus_idx" ON "Device"("lockStatus");

-- CreateIndex
CREATE INDEX "Device_contractId_idx" ON "Device"("contractId");

-- CreateIndex
CREATE INDEX "Device_customerId_idx" ON "Device"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "MdmCommand_idempotencyKey_key" ON "MdmCommand"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MdmCommand_status_idx" ON "MdmCommand"("status");

-- CreateIndex
CREATE INDEX "MdmCommand_deviceId_createdAt_idx" ON "MdmCommand"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_deviceId_idx" ON "AuditLog"("deviceId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "LoanContract" ADD CONSTRAINT "LoanContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LoanContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdmCommand" ADD CONSTRAINT "MdmCommand_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdmCommand" ADD CONSTRAINT "MdmCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
