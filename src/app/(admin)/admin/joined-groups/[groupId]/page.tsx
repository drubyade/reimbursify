"use client";

import { use } from "react";
import { GroupFormsView } from "@/components/shared-groups/GroupFormsView";
import { OfflineGuard } from "@/components/OfflineGuard";

export default function AdminJoinedGroupFormsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  return (
    <OfflineGuard featureName="Form filling">
      <GroupFormsView groupId={groupId} baseRoute="/admin/joined-groups" />
    </OfflineGuard>
  );
}
