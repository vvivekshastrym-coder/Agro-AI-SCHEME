import { AgroPlatformService } from "@agro/api";
import { formatDeadlineTruthfully } from "@agro/ui";
import type { SupportedLanguage } from "@agro/shared";

// ============================================================================
// BullMQ-Compatible Deadline Guardian & Reminder Queue Processor (Phase 0 & 3)
// ============================================================================

export interface DeadlineReminderJob {
  idempotencyKey: string;
  farmerId: string;
  farmerEmail: string | null;
  schemeVersionId: string;
  deadlineId: string;
  language: SupportedLanguage;
}

export interface ProcessedReminderResult {
  idempotencyKey: string;
  skippedReason?: string;
  delivered: boolean;
  formattedDeadline: string;
  isMockDelivery: boolean;
}

export class DeadlineGuardianWorker {
  private readonly processedKeys = new Set<string>();

  constructor(private readonly platform: AgroPlatformService) {}

  public async processReminderJob(
    job: DeadlineReminderJob
  ): Promise<ProcessedReminderResult> {
    if (this.processedKeys.has(job.idempotencyKey)) {
      return {
        idempotencyKey: job.idempotencyKey,
        skippedReason: "DUPLICATE_IDEMPOTENCY_KEY",
        delivered: false,
        formattedDeadline: "",
        isMockDelivery: true,
      };
    }

    const version = this.platform
      .listAllSchemeVersions()
      .find((v) => v.id === job.schemeVersionId);
    const deadline = version?.deadlines.find((d) => d.id === job.deadlineId);

    if (!version || !deadline) {
      return {
        idempotencyKey: job.idempotencyKey,
        skippedReason: "DEADLINE_NOT_FOUND",
        delivered: false,
        formattedDeadline: "",
        isMockDelivery: true,
      };
    }

    const truthfulDeadline = formatDeadlineTruthfully(
      deadline.dueDateIso,
      deadline.isVerified,
      job.language
    );

    if (!truthfulDeadline.isVerified) {
      // Never send a false calendar date reminder for an unverified deadline
      return {
        idempotencyKey: job.idempotencyKey,
        skippedReason: "UNVERIFIED_DEADLINE_SUPPRESSED",
        delivered: false,
        formattedDeadline: truthfulDeadline.text,
        isMockDelivery: true,
      };
    }

    this.processedKeys.add(job.idempotencyKey);

    if (job.farmerEmail) {
      await this.platform.emailProvider.sendMail(
        job.farmerEmail,
        `[Agro AI Scheme] Deadline Reminder: ${deadline.titleEn}`,
        `Official Deadline: ${truthfulDeadline.text} — Source: ${deadline.sourceUrl}`
      );
    }

    return {
      idempotencyKey: job.idempotencyKey,
      delivered: true,
      formattedDeadline: truthfulDeadline.text,
      isMockDelivery: true,
    };
  }
}

if (require.main === module) {
  const platform = new AgroPlatformService();
  const worker = new DeadlineGuardianWorker(platform);
  console.log(
    JSON.stringify({
      level: "info",
      service: "@agro/worker",
      msg: "Deadline Guardian Worker initialized",
      queues: ["deadline-guardian-reminders"],
      ready: Boolean(worker),
    })
  );
}
