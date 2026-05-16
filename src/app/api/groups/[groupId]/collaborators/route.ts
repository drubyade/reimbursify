import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ groupId: string }>;
}

// GET /api/groups/[groupId]/collaborators — list collaborators
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

    const collaborators = await prisma.groupCollaborator.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, role: true } },
      },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json({ error: "Failed to fetch collaborators" }, { status: 500 });
  }
}

// POST /api/groups/[groupId]/collaborators — add a collaborator by email
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

    // Only HEAD of the group can add collaborators
    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    });

    if (!membership || membership.role !== "HEAD") {
      return NextResponse.json({ error: "Only the group HEAD can manage collaborators" }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
    }

    // Don't allow adding yourself
    if (user.id === session.user.id) {
      return NextResponse.json({ error: "You cannot add yourself as a collaborator" }, { status: 400 });
    }

    // Check if already a collaborator
    const existing = await prisma.groupCollaborator.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "This user is already a collaborator" }, { status: 409 });
    }

    const collaborator = await prisma.groupCollaborator.create({
      data: { groupId, userId: user.id },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, role: true } },
      },
    });

    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/collaborators — remove a collaborator
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    });

    if (!membership || membership.role !== "HEAD") {
      return NextResponse.json({ error: "Only the group HEAD can manage collaborators" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await prisma.groupCollaborator.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    return NextResponse.json({ message: "Collaborator removed" });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json({ error: "Failed to remove collaborator" }, { status: 500 });
  }
}
