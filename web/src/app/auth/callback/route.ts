import {
  NextRequest,
  NextResponse
} from "next/server";

import { createClient } from "@/lib/supabase/server";


export async function GET(
  request: NextRequest
) {
  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code"
    );


  if (code) {
    const supabase =
      await createClient();

    const { error } =
      await supabase.auth
        .exchangeCodeForSession(
          code
        );


    if (error) {
      console.error(
        "[Auth] Confirmation failed:",
        error.message
      );

      return NextResponse.redirect(
        new URL(
          "/auth?error=confirmation_failed",
          request.url
        )
      );
    }
  }


  return NextResponse.redirect(
    new URL(
      "/",
      request.url
    )
  );
}