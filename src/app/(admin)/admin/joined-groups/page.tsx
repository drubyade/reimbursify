"use client";

import { GroupListView } from "@/components/shared-groups/GroupListView";

export default function AdminJoinedGroupsPage() {
  return <GroupListView baseRoute="/admin/joined-groups" apiQuery="?view=joined" />;
}
