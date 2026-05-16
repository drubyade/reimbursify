import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetUser = await prisma.user.findFirst({
    where: { OR: [{ username: "drubyades" }, { email: { contains: "drubyades" } }] }
  });

  if (!targetUser) {
    console.error("User drubyades not found!");
    return;
  }
  
  console.log("Found user:", targetUser.email, "ID:", targetUser.id);

  // See if user is in any group
  let membership = await prisma.groupMembership.findFirst({
    where: { userId: targetUser.id },
    include: { group: true }
  });

  let group;
  if (!membership) {
    console.log("User is not in any group. Creating a new group for them...");
    group = await prisma.group.create({
      data: {
        groupId: `GROUP_${targetUser.id.substring(0, 5)}`,
        secretKey: "SECRET123",
        name: "My Personal Reimbursify Group",
        description: "Default group",
        createdById: targetUser.id,
        members: {
          create: {
            userId: targetUser.id,
            role: "HEAD"
          }
        }
      }
    });
    console.log("Created group:", group.name);
  } else {
    group = membership.group;
    console.log("User is in group:", group.name);
  }

  // Move the IIT Ropar TA Form to this group and user
  const formTemplate = await prisma.formTemplate.findFirst({
    where: { title: "IIT Ropar TA Form" }
  });

  if (formTemplate) {
    await prisma.formTemplate.update({
      where: { id: formTemplate.id },
      data: {
        groupId: group.id,
        createdById: targetUser.id
      }
    });
    console.log("Successfully moved the IIT Ropar TA Form to drubyades!");
  } else {
    console.error("IIT Ropar TA Form not found in database!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
