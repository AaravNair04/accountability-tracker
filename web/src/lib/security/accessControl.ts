type PeerInvitationAccessInput = {
  userId: string;
  invitation: {
    peerId: string;
    status: string;
    revokedAt: Date | null;
  };
};


type ReportResponseAccessInput = {
  userId: string;
  report: {
    userId: string;
  };
  relationship:
    | {
        status: string;
        revokedAt: Date | null;
      }
    | null;
  delivery:
    | {
        id: string;
      }
    | null;
};


type SourceDeviceAccessInput = {
  authenticatedUserId: string;
  authenticatedDeviceId: string;
  requestedSourceDevice:
    | {
        id: string;
        userId: string;
      }
    | null;
};


export function canRespondToPeerInvitation({
  userId,
  invitation
}: PeerInvitationAccessInput) {
  return (
    invitation.peerId === userId &&
    invitation.status === "pending" &&
    invitation.revokedAt === null
  );
}


export function canSubmitReportResponse({
  userId,
  report,
  relationship,
  delivery
}: ReportResponseAccessInput) {
  return (
    report.userId !== userId &&
    relationship?.status === "accepted" &&
    relationship.revokedAt === null &&
    delivery !== null
  );
}


export function resolvePermittedSourceDeviceId({
  authenticatedUserId,
  authenticatedDeviceId,
  requestedSourceDevice
}: SourceDeviceAccessInput) {
  if (!requestedSourceDevice) {
    return authenticatedDeviceId;
  }

  if (
    requestedSourceDevice.userId !==
    authenticatedUserId
  ) {
    return null;
  }

  return requestedSourceDevice.id;
}
