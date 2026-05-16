"use client";

import { use } from "react";
import { GroupMessages } from "@/components/group-messages";
import { OfflineGuard } from "@/components/OfflineGuard";

export function GroupMessagesView({ groupId, baseRoute = "/groups" }: { groupId: string, baseRoute?: string }) {
  return (
    <OfflineGuard featureName="Messaging">
      <GroupMessages groupId={groupId} backUrl={`${baseRoute}/${groupId}`} />
    </OfflineGuard>
  );
}
