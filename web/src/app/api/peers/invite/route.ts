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


    // Authenticated users should have an email.
    if (!user.email) {

      return NextResponse.json(
        {
          error:
            "Your account does not have an email address."
        },
        {
          status: 400
        }
      );

    }

    const rateLimit =
      checkRateLimit({
        key:
          `peer:invite:${user.id}`,
        limit:
          20,
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


    // Read the peer email or username.
    const body =
      await request.json();


    const peerIdentifier =
      typeof body.peerIdentifier ===
        "string"
        ? body.peerIdentifier
            .trim()
            .toLowerCase()
        : typeof body.email ===
          "string"
          ? body.email
              .trim()
              .toLowerCase()
          : "";

    const normalizedUsername =
      peerIdentifier.startsWith(
        "@"
      )
        ? peerIdentifier.slice(
            1
          )
        : peerIdentifier;


    if (!peerIdentifier) {

      return NextResponse.json(
        {
          error:
            "Email or username is required."
        },
        {
          status: 400
        }
      );

    }


    // Keep the current Supabase user synchronized with Prisma.
    const currentUser =
      await prisma.user.upsert({

        where: {
          id:
            user.id
        },

        update: {
          email:
            user.email.toLowerCase()
        },

        create: {
          id:
            user.id,

          email:
            user.email.toLowerCase()
        }

      });


    // Find the person being invited.
    const peer =
      peerIdentifier.includes(
        "@"
      ) &&
      !peerIdentifier.startsWith(
        "@"
      )
        ? await prisma.user.findUnique({

            where: {
              email:
                peerIdentifier
            }

          })
        : await prisma.user.findUnique({

            where: {
              username:
                normalizedUsername
            }

          });


    if (!peer) {

      return NextResponse.json(
        {
          error:
            "No registered user was found with that email or username."
        },
        {
          status: 404
        }
      );

    }


    // A user cannot hold themselves accountable.
    if (
      peer.id ===
      currentUser.id
    ) {

      return NextResponse.json(
        {
          error:
            "You cannot invite yourself."
        },
        {
          status: 400
        }
      );

    }


    // Check whether this directional relationship already exists.
    const existingRelationship =
      await prisma.trustedPeer.findUnique({

        where: {

          ownerId_peerId: {

            ownerId:
              currentUser.id,

            peerId:
              peer.id

          }

        }

      });


    if (existingRelationship) {

      if (
        existingRelationship.revokedAt ||
        existingRelationship.status ===
          "revoked"
      ) {

        const updatedRelationship =
          await prisma.trustedPeer.update({

            where: {
              id:
                existingRelationship.id
            },

            data: {
              status:
                "pending",

              revokedAt:
                null
            }

          });


        await recordAuditEvent({
          userId:
            currentUser.id,

          actorUserId:
            currentUser.id,

          action:
            "peer_invitation_sent",

          subjectType:
            "trusted_peer",

          subjectId:
            updatedRelationship.id,

          metadata: {
            peerEmail:
              peer.email,

            resent:
              true
          }
        });

        await recordAuditEvent({
          userId:
            peer.id,

          actorUserId:
            currentUser.id,

          action:
            "peer_invitation_received",

          subjectType:
            "trusted_peer",

          subjectId:
            updatedRelationship.id,

          metadata: {
            ownerEmail:
              currentUser.email,

            resent:
              true
          }
        });


        return NextResponse.json(
          {
            success:
              true,

            message:
              "Invitation sent again.",

            invitation:
              updatedRelationship
          },
          {
            status: 200
          }
        );

      }


      // Invitation is already waiting.
      if (
        existingRelationship.status ===
        "pending"
      ) {

        return NextResponse.json(
          {
            error:
              "An invitation has already been sent to this user."
          },
          {
            status: 409
          }
        );

      }


      // They are already connected.
      if (
        existingRelationship.status ===
        "accepted"
      ) {

        return NextResponse.json(
          {
            error:
              "This user is already your accountability peer."
          },
          {
            status: 409
          }
        );

      }


      // A previously rejected invitation can be sent again.
      if (
        existingRelationship.status ===
        "rejected"
      ) {

        const updatedRelationship =
          await prisma.trustedPeer.update({

            where: {
              id:
                existingRelationship.id
            },

            data: {
              status:
                "pending",

              revokedAt:
                null
            }

          });


        await recordAuditEvent({
          userId:
            currentUser.id,

          actorUserId:
            currentUser.id,

          action:
            "peer_invitation_sent",

          subjectType:
            "trusted_peer",

          subjectId:
            updatedRelationship.id,

          metadata: {
            peerEmail:
              peer.email,

            resent:
              true
          }
        });

        await recordAuditEvent({
          userId:
            peer.id,

          actorUserId:
            currentUser.id,

          action:
            "peer_invitation_received",

          subjectType:
            "trusted_peer",

          subjectId:
            updatedRelationship.id,

          metadata: {
            ownerEmail:
              currentUser.email,

            resent:
              true
          }
        });


        return NextResponse.json(
          {
            success:
              true,

            message:
              "Invitation sent again.",

            invitation:
              updatedRelationship
          },
          {
            status: 200
          }
        );

      }

    }


    // Create a brand-new invitation.
    const invitation =
      await prisma.trustedPeer.create({

        data: {

          ownerId:
            currentUser.id,

          peerId:
            peer.id,

          status:
            "pending"

        }

      });


    await recordAuditEvent({
      userId:
        currentUser.id,

      actorUserId:
        currentUser.id,

      action:
        "peer_invitation_sent",

      subjectType:
        "trusted_peer",

      subjectId:
        invitation.id,

      metadata: {
        peerEmail:
          peer.email,

        resent:
          false
      }
    });

    await recordAuditEvent({
      userId:
        peer.id,

      actorUserId:
        currentUser.id,

      action:
        "peer_invitation_received",

      subjectType:
        "trusted_peer",

      subjectId:
        invitation.id,

      metadata: {
        ownerEmail:
          currentUser.email,

        resent:
          false
      }
    });


    return NextResponse.json(
      {
        success:
          true,

        message:
          "Accountability invitation sent.",

        invitation
      },
      {
        status: 201
      }
    );


  } catch (error) {

    console.error(
      "[Peers] Invite failed:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to send invitation."
      },
      {
        status: 500
      }
    );

  }

}
