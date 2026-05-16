import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isFavorite, isArchived } = await req.json();

    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const updatedData: any = {};
    if (isFavorite !== undefined) updatedData.isFavorite = isFavorite;
    if (isArchived !== undefined) updatedData.isArchived = isArchived;

    const updatedMembership = await prisma.groupMembership.update({
      where: {
        id: membership.id,
      },
      data: updatedData,
    });

    return NextResponse.json({ success: true, membership: updatedMembership });
  } catch (error) {
    console.error("Update group preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
