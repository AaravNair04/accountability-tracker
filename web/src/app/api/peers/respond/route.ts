import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  recordAuditEvent
} from "@/lib/auditLog";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  rateLimitResponse
} from "@/lib/rateLimit";
import {
  canRespondToPeerInvitation
} from "@/lib/security/accessControl";
import { createClient } from "@/lib/supabase/server";


export async function POST(
  request: NextRequest
) {

  try {

    // Get the logged-in user.
    const supabase =
      await createClient();


    const {
      data: { user }
    } =
      await supabase.auth.getUser();


    if (!user) {

      return NextResponse.json(
        {
          error:
            "You must be logged in."
        },
        {
          status: 401
        }
      );

    }

    const rateLimit = await checkRateLimit({
        key:
          `peer:respond:${user.id}`,
        limit:
          40,
        windowMs:
          60 * 60 * 1000
      });

    if (
      !rateLimit.allowed
    ) {
      return rateLimitResponse(
        rateLimit.retryAfterSeconds
      );
    }


    // Read the request body.
    const body =
      await request.json();


    const invitationId =
      typeof body.invitationId === "string"
        ? body.invitationId.trim()
        : "";


    const action =
      typeof body.action === "string"
        ? body.action
            .trim()
            .toLowerCase()
        : "";


    if (!invitationId) {

      return NextResponse.json(
        {
          error:
            "Invitation ID is required."
        },
        {
          status: 400
        }
      );

    }


    if (
      action !== "accept" &&
      action !== "reject"
    ) {

      return NextResponse.json(
        {
          error:
            "Action must be accept or reject."
        },
        {
          status: 400
        }
      );

    }


    // Find the invitation.
    const invitation =
      await prisma.trustedPeer.findUnique({

        where: {
          id:
            invitationId
        }

      });


    if (!invitation) {

      return NextResponse.json(
        {
          error:
            "Invitation not found."
        },
        {
          status: 404
        }
      );

    }


    /*
      Important security check:

      ownerId = person being held accountable
      peerId  = person receiving the invitation

      Only the peer can accept/reject it.
    */
    if (
      invitation.peerId !==
      user.id
    ) {

      return NextResponse.json(
        {
          error:
            "You are not allowed to respond to this invitation."
        },
        {
          status: 403
        }
      );

    }


    // Only pending invitations can be answered.
    if (
      !canRespondToPeerInvitation({
        userId:
          user.id,

        invitation
      })
    ) {

      return NextResponse.json(
        {
          error:
            "This invitation is no longer active."
        },
        {
          status: 409
        }
      );

    }


    const newStatus =
      action === "accept"
        ? "accepted"
        : "rejected";


    // Update the invitation.
    const updatedInvitation =
      await prisma.trustedPeer.update({

        where: {
          id:
            invitation.id
        },

        data: {
          status:
            newStatus
        }

      });


    await recordAuditEvent({
      userId:
        invitation.ownerId,

      actorUserId:
        user.id,

      action:
        action === "accept"
          ? "peer_invitation_accepted"
          : "peer_invitation_rejected",

      subjectType:
        "trusted_peer",

      subjectId:
        updatedInvitation.id,

      metadata: {
        peerId:
          user.id
      }
    });

    await recordAuditEvent({
      userId:
        user.id,

      actorUserId:
        user.id,

      action:
        action === "accept"
          ? "peer_invitation_accepted"
          : "peer_invitation_rejected",

      subjectType:
        "trusted_peer",

      subjectId:
        updatedInvitation.id,

      metadata: {
        ownerId:
          invitation.ownerId
      }
    });


    return NextResponse.json(
      {
        success:
          true,

        message:
          action === "accept"
            ? "Accountability invitation accepted."
            : "Accountability invitation rejected.",

        invitation:
          updatedInvitation
      },
      {
        status: 200
      }
    );


  } catch (error) {

    console.error(
      "[Peers] Respond failed:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to respond to invitation."
      },
      {
        status: 500
      }
    );

  }

}
