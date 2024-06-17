-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'talent', 'client', 'creative');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "YesOrNo" AS ENUM ('Yes', 'No');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "ClientSetupType" AS ENUM ('PERSONAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ChargeTime" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('SIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "HireStatus" AS ENUM ('HIRED', 'PENDING', 'REJECTED', 'APPROVED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('FAILED', 'PENDING', 'SUCCESS', 'REVERSED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "BriefFormType" AS ENUM ('doc', 'fill');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ONHOLD', 'PENDING', 'ONGOING', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "primarySkill" TEXT,
    "userStatus" "UserStatus" NOT NULL DEFAULT 'active',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatar" JSONB,
    "skillAttachments" JSONB[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefForm" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "videos" JSONB[],
    "images" JSONB[],
    "docs" JSONB[],
    "role_name" TEXT,
    "role_type" TEXT,
    "gender" "Gender",
    "age" TEXT,
    "nationality" TEXT,
    "willing_to_pay" "YesOrNo",
    "duration" TEXT,
    "rate_type" "ChargeTime",
    "compensation" TEXT,
    "shoot_date" TEXT,
    "shoot_time" TEXT,
    "shoot_address" TEXT,
    "shoot_info" TEXT,
    "audition_date" TEXT,
    "audition_time" TEXT,
    "audition_options" TEXT,
    "audition_type" TEXT,
    "venue" TEXT,
    "city" TEXT,
    "state" TEXT,
    "audition_address" TEXT,
    "pre_screen" "YesOrNo",
    "audition_instruction" TEXT,
    "brief_date_expiry" TEXT,
    "brief_time_expiry" TEXT,
    "attachments" JSONB[],
    "briefType" "BriefFormType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" UUID NOT NULL,

    CONSTRAINT "BriefForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" UUID NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "key" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referred" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Referred_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "lastAmountWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "lastAmountDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "lastWithdrewAt" TIMESTAMP(3),
    "lastDepoistedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "recipient_code" TEXT NOT NULL,
    "integration" INTEGER NOT NULL,
    "type" TEXT DEFAULT 'nuban',
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "authorization_code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TxHistory" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "settlementAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "status" "TxStatus" NOT NULL,
    "totalFee" DOUBLE PRECISION,
    "paystackFee" DOUBLE PRECISION,
    "processingFee" DOUBLE PRECISION,
    "channel" TEXT,
    "type" "TxType" NOT NULL,
    "source" TEXT,
    "narration" TEXT,
    "authorization_code" TEXT,
    "destinationAccountName" TEXT,
    "destinationAccountNumber" TEXT,
    "destinationBankCode" TEXT,
    "destinationBankName" TEXT,
    "sourceAccountName" TEXT,
    "sourceAccountNumber" TEXT,
    "sourceBankCode" TEXT,
    "sourceBankName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "TxHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscribedEmails" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "SubscribedEmails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "replied" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'admin',

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "randomCode" TEXT NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Totp" (
    "id" UUID NOT NULL,
    "otp" TEXT NOT NULL,
    "otp_expiry" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Totp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" UUID NOT NULL,
    "video" JSONB,
    "audio" JSONB,
    "images" JSONB[],
    "userId" UUID NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" UUID NOT NULL,
    "yearsOfExperience" TEXT NOT NULL,
    "proficiencyLevel" TEXT NOT NULL,
    "brandsWorkedWith" TEXT,
    "projectType" TEXT,
    "roleOrPosition" TEXT,
    "projectDuration" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateAndAvailability" (
    "id" UUID NOT NULL,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "chargeTime" "ChargeTime" NOT NULL,
    "charge" DOUBLE PRECISION NOT NULL,
    "weekdays" TEXT[],
    "userId" UUID NOT NULL,

    CONSTRAINT "RateAndAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "subSkills" TEXT[],
    "yearsOfExperience" TEXT NOT NULL,
    "chargeTime" "ChargeTime",
    "charge" DOUBLE PRECISION,
    "userId" UUID NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" UUID NOT NULL,
    "bio" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativePersonalInfo" (
    "id" UUID NOT NULL,
    "proofOfId" JSONB,
    "phone" TEXT,
    "altPhone" TEXT,
    "gender" "Gender",
    "religion" TEXT,
    "dob" TEXT,
    "country" TEXT,
    "state" TEXT,
    "address" TEXT,
    "idType" TEXT,
    "languages" TEXT[],
    "fbHandle" TEXT,
    "igHandle" TEXT,
    "xHandle" TEXT,
    "creativeId" UUID NOT NULL,

    CONSTRAINT "CreativePersonalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeCertification" (
    "id" UUID NOT NULL,
    "school" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "study" TEXT NOT NULL,
    "level" TEXT,
    "level_type" TEXT,
    "creativeId" UUID NOT NULL,

    CONSTRAINT "CreativeCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSetup" (
    "id" UUID NOT NULL,
    "type" "ClientSetupType" NOT NULL,
    "address" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT NOT NULL,
    "prof_title" TEXT,
    "dob" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedIn" TEXT,
    "document_type" TEXT,
    "document" JSONB,
    "id_type" TEXT,
    "proof_of_id" JSONB[],
    "reg_type" TEXT,
    "reg_no" TEXT,
    "clientId" UUID NOT NULL,

    CONSTRAINT "ClientSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentPersonalInfo" (
    "id" UUID NOT NULL,
    "phone" TEXT,
    "altPhone" TEXT,
    "gender" "Gender",
    "religion" TEXT,
    "dob" TEXT,
    "playingMaxAge" TEXT,
    "playingMinAge" TEXT,
    "nationality" TEXT,
    "workingTitle" TEXT,
    "country" TEXT,
    "state" TEXT,
    "address" TEXT,
    "idType" TEXT NOT NULL,
    "proofOfId" JSONB,
    "languages" TEXT[],
    "fbHandle" TEXT,
    "igHandle" TEXT,
    "xHandle" TEXT,
    "talentId" UUID NOT NULL,

    CONSTRAINT "TalentPersonalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talentBioStats" (
    "id" UUID NOT NULL,
    "bio" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "hairColor" TEXT,
    "eyeColor" TEXT,
    "gender" "Gender",
    "burst" TEXT,
    "hips" TEXT,
    "waist" TEXT,
    "dressSize" TEXT,
    "talentId" UUID NOT NULL,

    CONSTRAINT "talentBioStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "playingAge" TEXT,
    "description" TEXT NOT NULL,
    "duration" TIMESTAMP(3),
    "app_deadline" TIMESTAMP(3) NOT NULL,
    "requirement" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "gender" "Gender",
    "rate" TEXT,
    "attachments" JSONB[],
    "status" "JobStatus" NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "adminId" UUID,
    "userId" UUID,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" UUID NOT NULL,
    "attachments" JSONB[],
    "cover_letter" TEXT,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "coverPhoto" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "readingTime" TEXT NOT NULL,
    "pending_approval" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "authorId" UUID,
    "adminId" UUID,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articleId" UUID NOT NULL,
    "userId" UUID,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" UUID NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articleId" UUID NOT NULL,
    "userId" UUID,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "proj_title" TEXT NOT NULL,
    "proj_type" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "payment_option" TEXT,
    "proj_date" TIMESTAMP(3) NOT NULL,
    "proj_duration" TEXT,
    "location" TEXT NOT NULL,
    "proj_time" TEXT NOT NULL,
    "additional_note" TEXT,
    "attachments" JSONB[],
    "clientId" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRoleInfo" (
    "id" UUID NOT NULL,
    "role_type" TEXT NOT NULL,
    "offer" DOUBLE PRECISION,
    "projectId" UUID NOT NULL,
    "talentOrCreativeId" UUID NOT NULL,

    CONSTRAINT "ProjectRoleInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalInfoProject" (
    "id" UUID NOT NULL,
    "org_name" TEXT NOT NULL,
    "job_title" TEXT,
    "country" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "means_of_id" TEXT NOT NULL,
    "proof_of_id" JSONB[],
    "projectId" UUID NOT NULL,

    CONSTRAINT "AdditionalInfoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hire" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "talentOrCreativeId" UUID NOT NULL,
    "status" "HireStatus" NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "file" JSONB NOT NULL,
    "signature" JSONB,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING',
    "signedByUser" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "declinedAt" TIMESTAMP(3),
    "userId" UUID,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" UUID NOT NULL,
    "point" DOUBLE PRECISION NOT NULL,
    "review" TEXT NOT NULL,
    "targetUserId" UUID NOT NULL,
    "raterUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inbox" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "adminId" UUID,

    CONSTRAINT "Inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "content" TEXT,
    "file" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "inboxId" UUID NOT NULL,
    "userSenderId" UUID,
    "adminSenderId" UUID,
    "userReceiverId" UUID,
    "adminReceiverId" UUID,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_key_key" ON "Referral"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_userId_key" ON "Referral"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_recipient_code_key" ON "Recipient"("recipient_code");

-- CreateIndex
CREATE UNIQUE INDEX "TxHistory_reference_key" ON "TxHistory"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "SubscribedEmails_email_key" ON "SubscribedEmails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_token_key" ON "Validation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_userId_key" ON "Validation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Totp_userId_key" ON "Totp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_key" ON "Portfolio"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RateAndAvailability_userId_key" ON "RateAndAvailability"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Creative_userId_key" ON "Creative"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativePersonalInfo_creativeId_key" ON "CreativePersonalInfo"("creativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSetup_clientId_key" ON "ClientSetup"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_userId_key" ON "Talent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentPersonalInfo_talentId_key" ON "TalentPersonalInfo"("talentId");

-- CreateIndex
CREATE UNIQUE INDEX "talentBioStats_talentId_key" ON "talentBioStats"("talentId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_authorId_key" ON "Article"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalInfoProject_projectId_key" ON "AdditionalInfoProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_projectId_key" ON "Contract"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Inbox_userId_key" ON "Inbox"("userId");

-- AddForeignKey
ALTER TABLE "BriefForm" ADD CONSTRAINT "BriefForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referred" ADD CONSTRAINT "Referred_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referred" ADD CONSTRAINT "Referred_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxHistory" ADD CONSTRAINT "TxHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Totp" ADD CONSTRAINT "Totp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateAndAvailability" ADD CONSTRAINT "RateAndAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativePersonalInfo" ADD CONSTRAINT "CreativePersonalInfo_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeCertification" ADD CONSTRAINT "CreativeCertification_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSetup" ADD CONSTRAINT "ClientSetup_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talent" ADD CONSTRAINT "Talent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPersonalInfo" ADD CONSTRAINT "TalentPersonalInfo_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talentBioStats" ADD CONSTRAINT "talentBioStats_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRoleInfo" ADD CONSTRAINT "ProjectRoleInfo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRoleInfo" ADD CONSTRAINT "ProjectRoleInfo_talentOrCreativeId_fkey" FOREIGN KEY ("talentOrCreativeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalInfoProject" ADD CONSTRAINT "AdditionalInfoProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_talentOrCreativeId_fkey" FOREIGN KEY ("talentOrCreativeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userSenderId_fkey" FOREIGN KEY ("userSenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_adminSenderId_fkey" FOREIGN KEY ("adminSenderId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userReceiverId_fkey" FOREIGN KEY ("userReceiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_adminReceiverId_fkey" FOREIGN KEY ("adminReceiverId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
