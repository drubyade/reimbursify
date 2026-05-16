import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/submissions/[id]/attest — get all attestations for a submission
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attestations = await prisma.signatureAttestation.findMany({
      where: { submissionId: id },
      include: {
        collaborator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { attestedAt: "asc" },
    });

    return NextResponse.json({ attestations });
  } catch (error) {
    console.error("Error fetching attestations:", error);
    return NextResponse.json({ error: "Failed to fetch attestations" }, { status: 500 });
  }
}

// POST /api/submissions/[id]/attest — attest a signature field
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { fieldId } = await req.json();

    if (!fieldId) {
      return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
    }

    // Get submission with template
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify the user is a collaborator for this group
    const isCollaborator = await prisma.groupCollaborator.findUnique({
      where: { groupId_userId: { groupId: submission.groupId, userId: session.user.id } },
    });

    if (!isCollaborator) {
      return NextResponse.json({ error: "You are not a collaborator for this group" }, { status: 403 });
    }

    // Verify the fieldId exists in the template and is assigned to this user
    let templateSchema: any;
    try {
      templateSchema = typeof submission.template.templateSchema === "string"
        ? JSON.parse(submission.template.templateSchema)
        : submission.template.templateSchema;
    } catch {
      return NextResponse.json({ error: "Invalid template schema" }, { status: 500 });
    }

    let matchedField: any = null;
    for (const section of (templateSchema.sections || [])) {
      for (const field of (section.fields || [])) {
        if (field.id === fieldId && field.type === "signature_authority") {
          matchedField = field;
          break;
        }
      }
      if (matchedField) break;
    }

    if (!matchedField) {
      return NextResponse.json({ error: "Signature field not found in template" }, { status: 404 });
    }

    if (matchedField.collaboratorId !== session.user.id) {
      return NextResponse.json({ error: "You are not assigned to this signature field" }, { status: 403 });
    }

    // Check for duplicate
    const existing = await prisma.signatureAttestation.findUnique({
      where: {
        submissionId_fieldId_collaboratorId: {
          submissionId: id,
          fieldId,
          collaboratorId: session.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already attested this field" }, { status: 409 });
    }

    const attestation = await prisma.signatureAttestation.create({
      data: {
        submissionId: id,
        fieldId,
        collaboratorId: session.user.id,
      },
      include: {
        collaborator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ attestation }, { status: 201 });
  } catch (error) {
    console.error("Error creating attestation:", error);
    return NextResponse.json({ error: "Failed to attest" }, { status: 500 });
  }
}
