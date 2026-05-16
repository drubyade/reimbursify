"use client";

import { use } from "react";
import { GroupMessages } from "@/components/group-messages";
import { OfflineGuard } from "@/components/OfflineGuard";

export default function GroupMessagesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  return (
    <OfflineGuard featureName="Messaging">
      <GroupMessages groupId={groupId} />
    </OfflineGuard>
  );
}
