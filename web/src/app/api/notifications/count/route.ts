import {
  NextResponse
} from "next/server";

import {
  getNotificationCount
} from "@/lib/notifications";
import {
  createClient
} from "@/lib/supabase/server";

export async function GET() {
  const supabase =
    await createClient();

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return NextResponse.json(
      {
        count:
          0
      },
      {
        headers: {
          "Cache-Control":
            "no-store"
        },
        status:
          401
      }
    );
  }

  const count =
    await getNotificationCount(
      user.id
    );

  return NextResponse.json(
    {
      count
    },
    {
      headers: {
        "Cache-Control":
          "no-store"
      }
    }
  );
}
