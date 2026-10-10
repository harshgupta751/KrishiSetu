import { NextResponse } from "next/server";
import { getNeo4jDriver } from "@/lib/neo4j";

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // 1. Clear existing data (optional, for development purposes)
    // await session.run(`MATCH (n) DETACH DELETE n`);

    // 2. Create nodes and relationships for Sustainability Knowledge Graph
    const query = `
      // Create Crops
      MERGE (cotton:Crop {name: 'Cotton', category: 'Fiber'})
      MERGE (rice:Crop {name: 'Rice', category: 'Cereal'})
      MERGE (soybean:Crop {name: 'Soybean', category: 'Oilseed'})

      // Create Pests/Diseases
      MERGE (bollworm:Pest {name: 'Pink Bollworm', type: 'Insect'})
      MERGE (blast:Pest {name: 'Rice Blast', type: 'Fungus'})
      MERGE (stemBorer:Pest {name: 'Stem Borer', type: 'Insect'})

      // Create Sustainable Treatments
      MERGE (neemOil:Treatment {
        name: 'Neem Oil Spray', 
        type: 'Organic',
        isEcoFriendly: true,
        description: 'Natural pesticide that disrupts insect growth without harming beneficial insects.',
        soilHealthBenefit: 'Leaves zero toxic chemical residue in the soil, preserving earthworms and essential soil microbes.',
        sustainabilityScore: 95
      })
      MERGE (trichogramma:Treatment {
        name: 'Trichogramma Wasps', 
        type: 'Biological Control',
        isEcoFriendly: true,
        description: 'Tiny wasps that parasitize the eggs of many moth and butterfly pests.',
        soilHealthBenefit: 'Completely natural biological control; prevents chemical accumulation in groundwater and soil layers.',
        sustainabilityScore: 100
      })
      MERGE (pseudomonas:Treatment {
        name: 'Pseudomonas fluorescens', 
        type: 'Bio-Fungicide',
        isEcoFriendly: true,
        description: 'Beneficial bacteria that suppresses fungal pathogens.',
        soilHealthBenefit: 'Actively promotes root growth and naturally enriches the soil microbiome instead of destroying it like synthetic fungicides.',
        sustainabilityScore: 90
      })

      // Create Relationships
      MERGE (cotton)-[:ATTACKED_BY]->(bollworm)
      MERGE (rice)-[:ATTACKED_BY]->(blast)
      MERGE (rice)-[:ATTACKED_BY]->(stemBorer)
      MERGE (soybean)-[:ATTACKED_BY]->(stemBorer)

      MERGE (bollworm)-[:TREATED_BY]->(trichogramma)
      MERGE (bollworm)-[:TREATED_BY]->(neemOil)
      MERGE (stemBorer)-[:TREATED_BY]->(neemOil)
      MERGE (blast)-[:TREATED_BY]->(pseudomonas)
    `;

    await session.run(query);

    return NextResponse.json({ success: true, message: "Sustainability Knowledge Graph seeded successfully." });
  } catch (error) {
    console.error("Neo4j Seeding Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed knowledge graph." },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
