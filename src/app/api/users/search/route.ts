import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    if (!query) {
      // By default, maybe return users they've messaged before?
      // For simplicity, just return an empty array if no query
      return NextResponse.json([]);
    }

    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    });

    if (!membership) {
      // Check if user is group creator or collaborator
      const [isCreator, isCollab] = await Promise.all([
        prisma.group.findFirst({ where: { id: groupId, createdById: session.user.id }, select: { id: true } }),
        prisma.groupCollaborator.findFirst({ where: { groupId, userId: session.user.id }, select: { id: true } }),
      ]);
      if (!isCreator && !isCollab) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        );
      }
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            username: {
              contains: query,
              // sqlite is case insensitive for LIKE usually, but we ensure it matches
            },
          },
          {
            id: {
              not: session.user.id, // don't search yourself
            },
          },
          {
            groupMemberships: {
              some: { groupId },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
