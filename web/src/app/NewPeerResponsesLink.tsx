import Link from "next/link";

import { prisma } from "@/lib/prisma";


type Props = {
  userId: string;
};


export default async function NewPeerResponsesLink({
  userId
}: Props) {

  // Count unseen responses on this user's reports.
  const newResponseCount =
    await prisma.reportResponse.count({

      where: {

        ownerViewedAt:
          null,

        report: {
          userId:
            userId
        }

      }

    });


  return (
    <Link href="/reports">

      Peer Responses

      {
        newResponseCount > 0 &&
        ` (${newResponseCount} new)`
      }

    </Link>
  );

}