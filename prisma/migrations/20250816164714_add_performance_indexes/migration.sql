-- CreateIndex
CREATE INDEX "Case_clientId_idx" ON "public"."Case"("clientId");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "public"."Case"("status");

-- CreateIndex
CREATE INDEX "Case_createdAt_idx" ON "public"."Case"("createdAt");

-- CreateIndex
CREATE INDEX "Case_createdById_idx" ON "public"."Case"("createdById");

-- CreateIndex
CREATE INDEX "CaseAssignment_userId_idx" ON "public"."CaseAssignment"("userId");

-- CreateIndex
CREATE INDEX "CaseAssignment_caseId_idx" ON "public"."CaseAssignment"("caseId");

-- CreateIndex
CREATE INDEX "Task_caseId_idx" ON "public"."Task"("caseId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "public"."Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_assignedById_idx" ON "public"."Task"("assignedById");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "public"."TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_caseId_idx" ON "public"."TimeEntry"("caseId");

-- CreateIndex
CREATE INDEX "TimeEntry_startTime_idx" ON "public"."TimeEntry"("startTime");

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "public"."TimeEntry"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_invoiceStatus_idx" ON "public"."TimeEntry"("invoiceStatus");
