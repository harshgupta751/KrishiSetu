/**
 * lib/neo4j-memory.ts
 * ============================================================
 * Neo4j Conversational Memory & RAG Context Retrieval Layer
 *
 * Implements:
 * 1. Conversational memory storage in Neo4j (linked list of messages)
 * 2. Farmer profile graph persistence
 * 3. Retrieval-Augmented Generation (RAG) context assembly
 * ============================================================
 */

import crypto from "crypto";
import { getNeo4jDriver } from "@/lib/neo4j";

/**
 * Checks whether Neo4j is configured with a non-placeholder URI.
 */
export function isNeo4jConfigured(): boolean {
  const uri = process.env.NEO4J_URI;
  if (!uri || uri.includes("placeholder.databases.neo4j.io")) {
    return false;
  }
  return true;
}

export interface UserProfileGraphData {
  displayName?: string;
  district?: string;
  state?: string;
  cropsGrown?: string[] | string;
  farmSize?: number | string;
  farmName?: string;
  landHolding?: number | string;
  primaryCrops?: string[] | string;
  location?: { district?: string; state?: string; pincode?: string };
  preferredLanguage?: string;
  [key: string]: any;
}

/**
 * Store or update user profile in Neo4j (synced from Firebase profile data).
 */
export async function storeUserProfileInGraph(
  userId: string,
  profileData: UserProfileGraphData
): Promise<void> {
  if (!userId || !isNeo4jConfigured()) return;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const properties: Record<string, any> = {};

    if (profileData.displayName !== undefined && profileData.displayName !== null) {
      properties.displayName = String(profileData.displayName);
    }
    if (profileData.farmName !== undefined && profileData.farmName !== null) {
      properties.farmName = String(profileData.farmName);
    }

    const district = profileData.district || profileData.location?.district;
    if (district !== undefined && district !== null) {
      properties.district = String(district);
    }

    const state = profileData.state || profileData.location?.state;
    if (state !== undefined && state !== null) {
      properties.state = String(state);
    }

    const farmSize = profileData.farmSize ?? profileData.landHolding;
    if (farmSize !== undefined && farmSize !== null) {
      const num = Number(farmSize);
      properties.farmSize = isNaN(num) ? String(farmSize) : num;
    }

    const rawCrops = profileData.cropsGrown ?? profileData.primaryCrops;
    let cropsList: string[] = [];
    if (Array.isArray(rawCrops)) {
      cropsList = rawCrops.map(String).map((s) => s.trim()).filter(Boolean);
      properties.cropsGrown = cropsList;
    } else if (typeof rawCrops === "string" && rawCrops.trim()) {
      cropsList = rawCrops.split(",").map((s) => s.trim()).filter(Boolean);
      properties.cropsGrown = cropsList;
    }

    if (profileData.preferredLanguage !== undefined && profileData.preferredLanguage !== null) {
      properties.preferredLanguage = String(profileData.preferredLanguage);
    }

    properties.updatedAt = Date.now();

    const query = `
      MERGE (u:UserProfile {userId: $userId})
      SET u += $properties
      WITH u
      MERGE (s:Session {sessionId: $userId, userId: $userId})
      MERGE (u)-[:HAS_SESSION]->(s)
      WITH u
      FOREACH (cropName IN $cropsList |
        MERGE (c:Crop {name: cropName})
        MERGE (u)-[:GROWS]->(c)
      )
    `;

    await session.run(query, {
      userId,
      properties,
      cropsList,
    });
  } catch (error) {
    console.error("[Neo4j storeUserProfileInGraph Error]:", error);
  } finally {
    await session.close();
  }
}

/**
 * Get user profile from Neo4j graph.
 */
export async function getUserProfileFromGraph(
  userId: string
): Promise<Record<string, any> | null> {
  if (!userId || !isNeo4jConfigured()) return null;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = `
      MATCH (u:UserProfile {userId: $userId})
      RETURN u
    `;
    const result = await session.run(query, { userId });
    if (result.records.length === 0) return null;

    const rawProps = result.records[0].get("u").properties;
    const props: Record<string, any> = {};

    for (const [key, val] of Object.entries(rawProps)) {
      if (
        val &&
        typeof val === "object" &&
        "toNumber" in val &&
        typeof (val as any).toNumber === "function"
      ) {
        props[key] = (val as any).toNumber();
      } else {
        props[key] = val;
      }
    }

    return props;
  } catch (error) {
    console.error("[Neo4j getUserProfileFromGraph Error]:", error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Store a message (human or AI) in Neo4j conversation history.
 * Maintains linked list ordering via [:HAS_MESSAGE] and [:NEXT] relationships.
 */
export async function addMessageToHistory(
  userId: string,
  role: "human" | "ai",
  content: string
): Promise<void> {
  if (!userId || !isNeo4jConfigured() || !content?.trim()) return;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const messageId = crypto.randomUUID();
    const timestamp = Date.now();

    const query = `
      MERGE (s:Session {sessionId: $userId, userId: $userId})
      WITH s
      OPTIONAL MATCH (u:UserProfile {userId: $userId})
      FOREACH (_ IN CASE WHEN u IS NOT NULL THEN [1] ELSE [] END |
        MERGE (u)-[:HAS_SESSION]->(s)
      )
      CREATE (m:Message {
        id: $messageId,
        role: $role,
        content: $content,
        timestamp: $timestamp
      })
      CREATE (s)-[:HAS_MESSAGE]->(m)
      WITH s, m
      OPTIONAL MATCH (s)-[r:LAST_MESSAGE]->(last:Message)
      FOREACH (_ IN CASE WHEN last IS NOT NULL THEN [1] ELSE [] END |
        CREATE (last)-[:NEXT]->(m)
        DELETE r
      )
      CREATE (s)-[:LAST_MESSAGE]->(m)
    `;

    await session.run(query, {
      userId,
      role,
      content,
      messageId,
      timestamp,
    });
  } catch (error) {
    console.error("[Neo4j addMessageToHistory Error]:", error);
  } finally {
    await session.close();
  }
}

/**
 * Get recent conversation history from Neo4j (last N messages).
 * Returns messages in chronological order (earliest to latest).
 */
export async function getConversationHistory(
  userId: string,
  limit: number = 6
): Promise<{ role: string; content: string }[]> {
  if (!userId || !isNeo4jConfigured()) return [];

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = `
      MATCH (s:Session {userId: $userId})-[:HAS_MESSAGE]->(m:Message)
      RETURN m.role AS role, m.content AS content, m.timestamp AS timestamp
      ORDER BY m.timestamp DESC
      LIMIT toInteger($limit)
    `;

    const result = await session.run(query, {
      userId,
      limit,
    });

    const history = result.records
      .map((record) => ({
        role: record.get("role") as string,
        content: record.get("content") as string,
        timestamp: record.get("timestamp"),
      }))
      .reverse();

    return history.map((h) => ({ role: h.role, content: h.content }));
  } catch (error) {
    console.error("[Neo4j getConversationHistory Error]:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * THE KEY RAG FUNCTION: Build relevant context from Neo4j for a given query.
 * Retrieves user profile + recent conversation history and formats them as a context string.
 */
export async function getRelevantContext(
  userId: string,
  query: string
): Promise<string> {
  if (!userId || !isNeo4jConfigured()) return "";

  try {
    const [profile, history] = await Promise.all([
      getUserProfileFromGraph(userId),
      getConversationHistory(userId, 6),
    ]);

    const sections: string[] = [];

    // 1. Profile Context from Knowledge Graph
    if (profile && Object.keys(profile).length > 0) {
      const profileLines: string[] = [];
      if (profile.displayName) profileLines.push(`- Farmer Name: ${profile.displayName}`);
      if (profile.farmName) profileLines.push(`- Farm Name: ${profile.farmName}`);
      if (profile.district || profile.state) {
        const loc = [profile.district, profile.state].filter(Boolean).join(", ");
        profileLines.push(`- Location: ${loc}`);
      }
      if (profile.cropsGrown) {
        const crops = Array.isArray(profile.cropsGrown)
          ? profile.cropsGrown.join(", ")
          : profile.cropsGrown;
        if (crops) profileLines.push(`- Crops Grown: ${crops}`);
      }
      if (profile.farmSize) profileLines.push(`- Farm Size: ${profile.farmSize} acres`);
      if (profile.preferredLanguage) profileLines.push(`- Preferred Language: ${profile.preferredLanguage}`);

      if (profileLines.length > 0) {
        sections.push(`FARMER PROFILE (from Knowledge Graph):\n${profileLines.join("\n")}`);
      }
    }

    // 2. Recent Conversation History from Memory Graph
    if (history && history.length > 0) {
      const historyLines = history.map(
        (m) => `${m.role === "human" ? "Farmer" : "Assistant"}: ${m.content}`
      );
      sections.push(`RECENT CONVERSATION HISTORY (from Memory Graph):\n${historyLines.join("\n")}`);
    }

    // 3. Relevant Sustainability Knowledge Graph insights if query matches pests
    if (query && query.trim()) {
      try {
        const driver = getNeo4jDriver();
        const session = driver.session();
        try {
          const kgQuery = `
            MATCH (p:Pest)-[:TREATED_BY]->(t:Treatment)
            WHERE toLower($query) CONTAINS toLower(p.name)
            RETURN p.name AS pest, t.name AS treatment, t.type AS type, t.description AS description, t.soilHealthBenefit AS soilHealthBenefit
            LIMIT 3
          `;
          const kgRes = await session.run(kgQuery, { query });
          if (kgRes.records.length > 0) {
            const kgLines = kgRes.records.map((r) => {
              const pest = r.get("pest");
              const tr = r.get("treatment");
              const ty = r.get("type");
              const desc = r.get("description");
              const soil = r.get("soilHealthBenefit");
              return `- Pest: ${pest} | Treatment: ${tr} (${ty}) - ${desc} Soil benefit: ${soil}`;
            });
            sections.push(`SUSTAINABILITY KNOWLEDGE GRAPH INSIGHTS:\n${kgLines.join("\n")}`);
          }
        } finally {
          await session.close();
        }
      } catch {
        // Non-critical, ignore if query fails
      }
    }

    return sections.join("\n\n");
  } catch (error) {
    console.error("[Neo4j getRelevantContext Error]:", error);
    return "";
  }
}
