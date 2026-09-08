import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import TimezoneSettings from "./TimezoneSettings";


export default async function SettingsPage() {

  // Get logged-in user.
  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  // Load current timezone.
  const profile =
    await prisma.user.findUnique({

      where: {
        id:
          user.id
      },

      select: {
        timezone:
          true
      }

    });


  if (!profile) {

    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "40px 20px",
          fontFamily: "Arial, sans-serif"
        }}
      >

        <h1>
          Settings
        </h1>

        <p>
          User profile not found.
        </p>

      </main>
    );

  }


  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >

      <Link href="/">
        ← Back to Dashboard
      </Link>


      <h1>
        Settings
      </h1>


      <TimezoneSettings
        currentTimezone={
          profile.timezone
        }
      />

    </main>
  );
}