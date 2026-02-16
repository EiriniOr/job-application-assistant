import { NextRequest, NextResponse } from "next/server";

// Demo: Store uploaded resume info (in-memory, resets on redeploy)
// In production, use cloud storage like Vercel Blob or S3

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, DOCX, DOC, or TXT." },
        { status: 400 }
      );
    }

    // In a real app, we'd upload to cloud storage and parse the resume
    // For demo, just return success with mock data
    const resume = {
      id: `resume_${Date.now()}`,
      filename: file.name,
      is_primary: true,
      created_at: new Date().toISOString(),
      size: file.size,
    };

    return NextResponse.json(resume);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
