import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateRandomId(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Generate unique credentials
    const groupId = `GRP-${generateRandomId(6)}`;
    const secretKey = `SEC-${generateRandomId(8)}`;

    const group = await prisma.group.create({
      data: {
        groupId,
        secretKey,
        name,
        description,
        createdById: session.user.id,
        // Automatically make the creator the HEAD of the group
        members: {
          create: {
            userId: session.user.id,
            role: "HEAD"
          }
        }
      }
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const view = req.nextUrl.searchParams.get("view");

    if (role === "ADMINISTRATOR" && view !== "joined") {
      const groups = await prisma.group.findMany({
        where: { createdById: session.user.id },
        include: { 
          _count: { select: { members: true } },
          members: { where: { userId: session.user.id }, take: 1 },
          collaborators: { where: { userId: session.user.id }, take: 1 }
        },
        orderBy: { createdAt: 'desc' }
      });
      const groupsWithStatus = groups.map(g => {
        const mem = g.members[0];
        const { members, collaborators, ...rest } = g;
        return {
          ...rest,
          isFavorite: mem ? mem.isFavorite : false,
          isArchived: rest.isArchived,
          isGloballyArchived: rest.isArchived,
          isCollaborator: collaborators.length > 0
        };
      });
      return NextResponse.json({ groups: groupsWithStatus });
    } else {
      const memberships = await prisma.groupMembership.findMany({
        where: { userId: session.user.id },
        include: { 
          group: {
            include: {
              collaborators: { where: { userId: session.user.id }, take: 1 }
            }
          } 
        },
        orderBy: { joinedAt: 'desc' }
      });
      const groups = memberships.map(m => {
        const { collaborators, ...groupRest } = m.group;
        return {
          ...groupRest,
          isFavorite: m.isFavorite,
          isArchived: m.group.isArchived || m.isArchived,
          isGloballyArchived: m.group.isArchived,
          isCollaborator: collaborators.length > 0
        };
      });
      return NextResponse.json({ groups });
    }

  } catch (error) {
    console.error("Fetch groups error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
