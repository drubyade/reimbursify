
// Force TS Server re-evaluation for Prisma Client
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/submissions - List submissions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's groups
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    // Fetch collaborations separately to avoid IDE Prisma include cache errors
    const userCollaborations = await prisma.groupCollaborator.findMany({
      where: { userId: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const tripId = searchParams.get("tripId");
    const templateId = searchParams.get("templateId");
    const needsAttestation = searchParams.get("needsAttestation") === "true";

    // ─── NEEDS ATTESTATION MODE ──────────────────────────────────────
    if (needsAttestation) {
      // Find all groups where this user is a collaborator
      const collaborations = await prisma.groupCollaborator.findMany({
        where: { userId: session.user.id },
        select: { groupId: true },
      });

      if (collaborations.length === 0) {
        return NextResponse.json({ submissions: [], total: 0 });
      }

      const collabGroupIds = collaborations.map((c) => c.groupId);

      // Get all non-draft submissions in those groups
      const allSubs = await prisma.submission.findMany({
        where: {
          groupId: { in: collabGroupIds },
          status: { in: ["SUBMITTED", "REVIEWED"] },
        },
        include: {
          template: { select: { id: true, title: true, version: true, templateSchema: true } },
          user: { select: { id: true, email: true, name: true } },
          trip: { select: { id: true, title: true } },
          attestations: { select: { fieldId: true, collaboratorId: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter to submissions where the user has unattested signature fields assigned to them
      const needsAttestList = allSubs.filter((sub) => {
        let schema: any;
        try {
          schema = typeof sub.template.templateSchema === "string"
            ? JSON.parse(sub.template.templateSchema)
            : sub.template.templateSchema;
        } catch {
          return false;
        }

        const sigFields: any[] = [];
        for (const section of (schema.sections || [])) {
          for (const field of (section.fields || [])) {
            if (field.type === "signature_authority" && field.collaboratorId === session.user!.id) {
              sigFields.push(field);
            }
          }
        }

        if (sigFields.length === 0) return false;

        // Check if any of those fields are not yet attested by this user
        const attestedFieldIds = new Set(
          sub.attestations
            .filter((a) => a.collaboratorId === session.user!.id)
            .map((a) => a.fieldId)
        );

        return sigFields.some((f) => !attestedFieldIds.has(f.id));
      });

      return NextResponse.json({
        submissions: needsAttestList.map((s) => ({ ...s, status: s.status })),
        total: needsAttestList.length,
      });
    }

    const groupIds = user.groupMemberships.map(m => m.groupId);
    const whereClause: any = {
      groupId: { in: groupIds },
    };

    if (status) {
      whereClause.status = status;
    }

    // If user is Submitter, they can only see their own submissions
    if (user.role === "SUBMITTER") {
      whereClause.userId = session.user.id;
    }

    if (tripId) {
      whereClause.tripId = tripId;
    }

    if (templateId) {
      whereClause.templateId = templateId;
    }

    // Filter by institute via trip
    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        template: {
          select: { id: true, title: true, version: true, templateSchema: true },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
        trip: {
          select: { 
            id: true, 
            title: true, 
            userId: true,
            expenses: {
              select: { id: true, amount: true, currency: true, title: true, vendor: true, paymentDate: true, status: true }
            }
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Filter submissions and obscure statuses based on roles
    const collabGroupIds = new Set(userCollaborations.map(c => c.groupId));
    const filtered = submissions.filter((s) => {
      const isAdminOrCollab = user.role === "ADMINISTRATOR" || collabGroupIds.has(s.groupId);
      
      if (isAdminOrCollab) {
        // Reimbursifier/Collaborator can see all submissions in their institute/group, EXCEPT drafts of others
        if (s.status === "DRAFT" && s.userId !== session.user?.id) {
          return false;
        }
        return true;
      }
      return s.userId === session.user?.id;
    }).map((s) => {
      let displayStatus = s.status;

      if (user.role === "SUBMITTER" && s.userId === session.user?.id) {
        // Submitter can't know when reimbursifier reviewed their own form
        if (s.status === "REVIEWED") {
          displayStatus = "SUBMITTED";
        }
      } 
      
      const isAdminOrCollab = user.role === "ADMINISTRATOR" || collabGroupIds.has(s.groupId);
      if (isAdminOrCollab && s.userId !== session.user?.id) {
        // Reimbursifier/Collaborator can't know which forms are settled
        if (s.status === "SETTLED") {
          displayStatus = "REVIEWED";
        }
      }

      return {
        ...s,
        status: displayStatus,
        _dbStatus: s.status, // Keeping original for debug/tracking if needed
      };
    });

    return NextResponse.json({
      submissions: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST /api/submissions - Create new submission
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { templateId, tripId, status, formData, expenseSelections } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    // Verify template exists and belongs to user's groups
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
    });

    const userGroupIds = user.groupMemberships.map(m => m.groupId);
    if (!template || !userGroupIds.includes(template.groupId)) {
      return NextResponse.json(
        { error: "Form template not found" },
        { status: 404 }
      );
    }

    // Get or Create Trip
    let finalTripId = tripId;
    let trip;

    if (finalTripId) {
      trip = await prisma.trip.findUnique({
        where: { id: finalTripId },
      });

      if (!trip || trip.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Trip not found or unauthorized" },
          { status: 404 }
        );
      }
    } else {
      // Auto-create a trip if no trip context was explicitly provided
      trip = await prisma.trip.create({
        data: {
          userId: session.user.id,
          title: `Direct Reimbursement - ${new Date().toLocaleDateString()}`,
          startDate: new Date(),
          purpose: "Direct submission from Reimbursements Dashboard",
        }
      });
      finalTripId = trip.id;
    }

    const submission = await prisma.submission.create({
      data: {
        templateId: templateId,
        userId: session.user.id,
        tripId: finalTripId,
        groupId: template.groupId,
        status: status || "SUBMITTED",
        submissionDate: new Date(),
        formData: formData ? JSON.stringify({ ...formData, _expenseSelections: expenseSelections }) : null,
      },
      include: {
        template: { select: { id: true, version: true, templateSchema: true } },
        user: { select: { id: true, email: true, name: true } },
        trip: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(
      { submission, message: "Submission created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
