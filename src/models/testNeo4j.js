import { driver } from "../config/db.js";

export async function testNeo4j() {
  const session = driver.session();
  try {
    const result = await session.run(
      "RETURN 'Conexión exitosa con Neo4j' as msg"
    );
    return result.records[0].get("msg");
  } finally {
    await session.close();
  }
}
