import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

    // Find the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, groupId: true, name: true, description: true, createdAt: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify user has access (member, creator, or collaborator)
    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: groupId, userId: session.user.id } },
    });

    if (!membership) {
      // Check if user is the group creator
      const isCreator = group.id ? await prisma.group.findFirst({
        where: { id: groupId, createdById: session.user.id },
        select: { id: true },
      }) : null;
      
      // Check if user is a collaborator
      const isCollaborator = await prisma.groupCollaborator.findFirst({
        where: { groupId: groupId, userId: session.user.id },
        select: { id: true },
      });
      
      if (!isCreator && !isCollaborator) {
        return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
      }
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("GET /api/groups/[groupId]:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;
    const body = await req.json();

    // Verify user is the admin who created the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.createdById !== session.user.id || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedData: any = {};
    if (body.isArchived !== undefined) updatedData.isArchived = body.isArchived;

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: updatedData,
    });

    return NextResponse.json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error("PATCH /api/groups/[groupId]:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
