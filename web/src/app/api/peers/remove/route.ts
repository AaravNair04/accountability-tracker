import {
  NextRequest,
  NextResponse
} from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


export async function POST(
  request: NextRequest
) {
  try {
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
          status:
            401
        }
      );
    }

    const body =
      await request.json();

    const relationshipId =
      typeof body.relationshipId ===
        "string"
        ? body.relationshipId.trim()
        : "";

    if (!relationshipId) {
      return NextResponse.json(
        {
          error:
            "Relationship ID is required."
        },
        {
          status:
            400
        }
      );
    }

    const relationship =
      await prisma.trustedPeer.findUnique({
        where: {
          id:
            relationshipId
        },

        select: {
          id:
            true,

          ownerId:
            true,

          revokedAt:
            true
        }
      });

    if (!relationship) {
      return NextResponse.json(
        {
          error:
            "Accountability peer relationship not found."
        },
        {
          status:
            404
        }
      );
    }

    if (
      relationship.ownerId !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You are not allowed to remove this accountability peer."
        },
        {
          status:
            403
        }
      );
    }

    if (
      relationship.revokedAt
    ) {
      return NextResponse.json(
        {
          success:
            true,

          message:
            "Accountability peer access was already revoked."
        },
        {
          status:
            200
        }
      );
    }

    const updatedRelationship =
      await prisma.trustedPeer.update({
        where: {
          id:
            relationship.id
        },

        data: {
          status:
            "revoked",

          revokedAt:
            new Date()
        }
      });

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Accountability peer access revoked.",

        relationship:
          updatedRelationship
      },
      {
        status:
          200
      }
    );

  } catch (error) {
    console.error(
      "[Peers] Remove failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to remove accountability peer."
      },
      {
        status:
          500
      }
    );
  }
}
