-- CreateTable
CREATE TABLE "EvaluationSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessScenario" TEXT,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EvaluationQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationSetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "inputData" TEXT,
    "referenceAnswer" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvaluationQuestion_evaluationSetId_fkey" FOREIGN KEY ("evaluationSetId") REFERENCES "EvaluationSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationDimension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "maxScore" REAL NOT NULL DEFAULT 100.0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvaluationDimension_evaluationSetId_fkey" FOREIGN KEY ("evaluationSetId") REFERENCES "EvaluationSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationSetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationSetId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationSetVersion_evaluationSetId_fkey" FOREIGN KEY ("evaluationSetId") REFERENCES "EvaluationSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT,
    "parameters" TEXT,
    "concurrencyLimit" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalSamples" INTEGER NOT NULL DEFAULT 0,
    "completedSamples" INTEGER NOT NULL DEFAULT 0,
    "failedSamples" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedReason" TEXT,
    "evaluationSetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelTask_evaluationSetId_fkey" FOREIGN KEY ("evaluationSetId") REFERENCES "EvaluationSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "modelOutput" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "latencyMs" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" DATETIME,
    "inputTokenCount" INTEGER NOT NULL DEFAULT 0,
    "outputTokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskSample_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ModelTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskSample_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EvaluationQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SampleScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sampleId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "dimensionId" TEXT,
    "scoreType" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "feedback" TEXT,
    "scoredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SampleScore_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "TaskSample" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SampleScore_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EvaluationQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SampleScore_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "EvaluationDimension" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sampleId" TEXT NOT NULL,
    "scoreId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "originalScore" REAL,
    "newScore" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualReview_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "TaskSample" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ManualReview_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "SampleScore" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoringRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleConfig" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EvaluationReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accuracy" REAL,
    "stability" REAL,
    "avgLatencyMs" REAL,
    "totalTokenCost" REAL,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "lowScoreSamples" INTEGER NOT NULL DEFAULT 0,
    "totalSamples" INTEGER NOT NULL DEFAULT 0,
    "reportData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "publishedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvaluationReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ModelTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportConclusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportConclusion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "EvaluationReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostStatistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "modelBreakdown" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TokenConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "tokenPricePerK" REAL NOT NULL DEFAULT 0.015,
    "consumedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenConsumption_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ModelTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CostStatistics_date_key" ON "CostStatistics"("date");
