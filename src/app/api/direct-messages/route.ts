import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { encryptAES, hashContent } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, receiverId, plaintext, aesKey } = await req.json();

    if (!groupId || !receiverId || !plaintext || !aesKey) {
      return NextResponse.json(
        { error: "groupId, receiverId, plaintext, and aesKey are required" },
        { status: 400 }
      );
    }

    const [senderMembership, receiverMembership] = await Promise.all([
      prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: session.user.id } },
      }),
      prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: receiverId } },
      }),
    ]);

    // Check sender access (member, creator, or collaborator)
    let senderHasAccess = !!senderMembership;
    if (!senderHasAccess) {
      const [isCreator, isCollab] = await Promise.all([
        prisma.group.findFirst({ where: { id: groupId, createdById: session.user.id }, select: { id: true } }),
        prisma.groupCollaborator.findFirst({ where: { groupId, userId: session.user.id }, select: { id: true } }),
      ]);
      senderHasAccess = !!(isCreator || isCollab);
    }
    
    // Check receiver access (member, creator, or collaborator)
    let receiverHasAccess = !!receiverMembership;
    if (!receiverHasAccess) {
      const [isCreator, isCollab] = await Promise.all([
        prisma.group.findFirst({ where: { id: groupId, createdById: receiverId }, select: { id: true } }),
        prisma.groupCollaborator.findFirst({ where: { groupId, userId: receiverId }, select: { id: true } }),
      ]);
      receiverHasAccess = !!(isCreator || isCollab);
    }

    if (!senderHasAccess || !receiverHasAccess) {
      return NextResponse.json(
        { error: "Both users must have access to this group" },
        { status: 403 }
      );
    }

    const encryptedContent = encryptAES(plaintext, aesKey);
    const contentHash = hashContent(plaintext);

    const dm = await prisma.directMessage.create({
      data: {
        groupId,
        senderId: session.user.id,
        receiverId,
        encryptedContent,
        contentHash,
      },
    });

    return NextResponse.json(dm, { status: 201 });
  } catch (error) {
    console.error("Error sending DM:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const otherId = searchParams.get("otherId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
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

    if (!otherId) {
      const [memberships, allDms] = await Promise.all([
        prisma.groupMembership.findMany({
          where: { groupId },
          include: { user: true },
        }),
        prisma.directMessage.findMany({
          where: {
            groupId,
            OR: [
              { senderId: session.user.id },
              { receiverId: session.user.id },
            ],
          },
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const headMembership = memberships.find((m) => m.role === "HEAD");
      const headUser = headMembership?.user || null;

      const userMap = new Map();

      for (const dm of allDms) {
        const isMeSender = dm.senderId === session.user.id;
        const otherUser = isMeSender ? dm.receiver : dm.sender;

        if (!userMap.has(otherUser.id)) {
          userMap.set(otherUser.id, {
            ...otherUser,
            unreadCount: 0,
            lastMessageAt: dm.createdAt,
          });
        }

        if (!isMeSender && !dm.isRead) {
          userMap.get(otherUser.id).unreadCount++;
        }
      }

      const members = memberships
        .map((m) => m.user)
        .filter((u) => u.id !== session.user?.id);

      const recentUsers = members
        .filter((u) => userMap.has(u.id))
        .map((u) => userMap.get(u.id));

      const noMessageUsers = members
        .filter((u) => !userMap.has(u.id))
        .map((u) => ({ ...u, unreadCount: 0, lastMessageAt: null }));

      recentUsers.sort(
        (a: any, b: any) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      noMessageUsers.sort((a: any, b: any) => {
        const aKey = (a.name || a.username || a.email || "").toLowerCase();
        const bKey = (b.name || b.username || b.email || "").toLowerCase();
        return aKey.localeCompare(bKey);
      });

      const pinnedHead =
        headUser && headUser.id !== session.user.id
          ? [{ ...headUser, unreadCount: 0, lastMessageAt: null, pinned: true }]
          : [];

      const headId = headUser?.id;
      const sortedUsers = [
        ...pinnedHead,
        ...recentUsers.filter((u: any) => u.id !== headId),
        ...noMessageUsers.filter((u: any) => u.id !== headId),
      ];

      // Mark delivered
      await prisma.directMessage.updateMany({
        where: {
          groupId,
          receiverId: session.user.id,
          isDelivered: false,
        },
        data: {
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });

      return NextResponse.json(sortedUsers);
    }

    const otherMembership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: otherId } },
    });

    if (!otherMembership) {
      // Check if other user is group creator or collaborator
      const [isCreator, isCollab] = await Promise.all([
        prisma.group.findFirst({ where: { id: groupId, createdById: otherId }, select: { id: true } }),
        prisma.groupCollaborator.findFirst({ where: { groupId, userId: otherId }, select: { id: true } }),
      ]);
      if (!isCreator && !isCollab) {
        return NextResponse.json(
          { error: "The other user is not a member of this group" },
          { status: 403 }
        );
      }
    }

    const dms = await prisma.directMessage.findMany({
      where: {
        groupId,
        OR: [
          {
            senderId: session.user.id,
            receiverId: otherId,
          },
          {
            senderId: otherId,
            receiverId: session.user.id,
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark as read
    await prisma.directMessage.updateMany({
      where: {
        groupId,
        senderId: otherId,
        receiverId: session.user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json(dms);
  } catch (error) {
    console.error("Error fetching DMs:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
