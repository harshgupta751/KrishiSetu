import { NextRequest, NextResponse } from "next/server";
import { storeUserProfileInGraph, getUserProfileFromGraph } from "@/lib/neo4j-memory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, displayName, district, cropsGrown, farmSize, ...rest } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    await storeUserProfileInGraph(userId, {
      displayName,
      district,
      cropsGrown,
      farmSize,
      ...rest,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/neo4j/memory Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to store user profile in graph" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const profile = await getUserProfileFromGraph(userId);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("[GET /api/neo4j/memory Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user profile from graph" },
      { status: 500 }
    );
  }
}
