import { prisma } from "@/lib/prisma";


type AuditMetadata =
  Record<
    string,
    string | number | boolean | null
  >;


type RecordAuditEventInput = {
  userId: string;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  actorUserId?: string | null;
  metadata?: AuditMetadata;
};


export async function recordAuditEvent({
  userId,
  action,
  subjectType,
  subjectId = null,
  actorUserId = null,
  metadata
}: RecordAuditEventInput) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId,

        action,

        subjectType,

        subjectId,

        actorUserId,

        metadata:
          metadata ?? undefined
      }
    });
  } catch (error) {
    console.error(
      "[Audit] Failed to record audit event:",
      error
    );
  }
}
