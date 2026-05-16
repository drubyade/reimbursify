"use client";

import { use } from "react";
import { GroupMessagesView } from "@/components/shared-groups/GroupMessagesView";

export default function AdminJoinedGroupMessagesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  return <GroupMessagesView groupId={groupId} baseRoute="/admin/joined-groups" />;
}
