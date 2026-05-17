"use server";

// Force TS Server re-evaluation for Prisma Client
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/submissions/[id] - Get submission details
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        template: true,
        user: { select: { id: true, email: true, name: true } },
        trip: {
          include: {
            expenses: {
              include: { bills: true, submittedBy: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Fetch attestations separately to avoid IDE Prisma include cache errors
    const attestations = await prisma.signatureAttestation.findMany({
      where: { submissionId: id },
      include: {
        collaborator: { select: { id: true, name: true, email: true } }
      }
    });

    // Attach to submission object
    const fullSubmission = {
      ...submission,
      attestations
    };

    // Verify ownership or admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isOwner = submission.userId === session.user.id;
    const isAdmin = user.role === "ADMINISTRATOR";

    // Check if user is a collaborator for this group
    const isCollaborator = await prisma.groupCollaborator.findFirst({
      where: { groupId: submission.groupId, userId: session.user.id },
    });

    if (!isOwner && !isAdmin && !isCollaborator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Reimbursifier can't see Submitter's drafts
    if (submission.status === "DRAFT" && isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let displayStatus = submission.status;

    if (isOwner) {
      // Submitter can't know when reimbursifier reviewed it
      if (submission.status === "REVIEWED") {
        displayStatus = "SUBMITTED";
      }
    } else if (isAdmin) {
      // Reimbursifier can't know which forms are settled
      if (submission.status === "SETTLED") {
        displayStatus = "REVIEWED";
      }
    }

    return NextResponse.json({ 
      submission: {
        ...fullSubmission,
        status: displayStatus,
        _dbStatus: submission.status
      } 
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

// PATCH /api/submissions/[id] - Update submission
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify ownership, Admin, or Collaborator
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    const isOwner = submission.userId === session.user.id;
    const isAdmin = user?.role === "ADMINISTRATOR";

    const isCollaborator = await prisma.groupCollaborator.findFirst({
      where: { groupId: submission.groupId, userId: session.user.id },
    });

    if (!isOwner && !isAdmin && !isCollaborator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { status, formData, reviewNotes, signatures, tripId, expenseSelections } = body;

    const validStatuses = ["DRAFT", "SUBMITTED", "REVIEWED", "SETTLED"];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    let finalFormData = undefined;
    if (formData !== undefined) {
      let parsed = typeof formData === "string" ? JSON.parse(formData) : { ...formData };
      if (expenseSelections !== undefined) {
        parsed._expenseSelections = expenseSelections;
      }
      finalFormData = JSON.stringify(parsed);
    } else if (expenseSelections !== undefined) {
      let parsed = submission.formData ? JSON.parse(submission.formData) : {};
      parsed._expenseSelections = expenseSelections;
      finalFormData = JSON.stringify(parsed);
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        ...(status && { status: status.toUpperCase() }),
        ...(reviewNotes !== undefined && { reviewNotes }),
        ...(signatures !== undefined && { signatures: JSON.stringify(signatures) }),
        ...(finalFormData !== undefined && { formData: finalFormData }),
        ...(tripId !== undefined && { tripId }),
      },
      include: {
        template: true,
        user: { select: { id: true, email: true, name: true } },
        trip: true,
      },
    });

    let displayStatus = updated.status;

    if (isOwner) {
      if (updated.status === "REVIEWED") displayStatus = "SUBMITTED";
    } else if (isAdmin) {
      if (updated.status === "SETTLED") displayStatus = "REVIEWED";
    }

    return NextResponse.json({
      submission: {
        ...updated,
        status: displayStatus,
        _dbStatus: updated.status
      },
      message: "Submission updated successfully",
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

// DELETE /api/submissions/[id] - Delete submission
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (submission.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only allow deletion of draft submissions
    if (submission.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft submissions can be deleted" },
        { status: 409 }
      );
    }

    await prisma.submission.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Submission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
