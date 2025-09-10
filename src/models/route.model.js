import { driver } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// Crear ruta con estaciones y sus relaciones
export async function createRoute({
  origin,
  destination,
  stops = [],
  startTime,
  endTime,
  isActive,
}) {
  const session = driver.session();
  const routeId = uuidv4();

  try {
    const query = `
      CREATE (r:Route {
        id: $routeId,
        startTime: $startTime,
        endTime: $endTime,
        isActive: $isActive
      })
      MERGE (o:Station {name: $origin, type: "origen"})
      MERGE (d:Station {name: $destination, type: "destino"})
      CREATE (r)-[:STARTS_AT]->(o)
      CREATE (r)-[:ENDS_AT]->(d)
      WITH r
      UNWIND $stops AS stopName
        MERGE (s:Station {name: stopName, type: "intermedia"})
        CREATE (r)-[:STOPS_AT]->(s)
      RETURN r {.*, origin: $origin, destination: $destination, stops: $stops } AS route
    `;

    const result = await session.run(query, {
      routeId,
      origin,
      destination,
      stops,
      startTime,
      endTime,
      isActive,
    });

    return result.records[0].get("route");
  } finally {
    await session.close();
  }
}

export async function getRoutes() {
  const session = driver.session();
  try {
    const query = `
      MATCH (r:Route {isActive: true})
      OPTIONAL MATCH (r)-[:STARTS_AT]->(o:Station)
      OPTIONAL MATCH (r)-[:ENDS_AT]->(d:Station)
      OPTIONAL MATCH (r)-[:STOPS_AT]->(s:Station)
      RETURN r.id AS id,
             r.startTime AS startTime,
             r.endTime AS endTime,
             r.isActive AS isActive,
             o.name AS origin,
             d.name AS destination,
             collect(s.name) AS stops
    `;
    const result = await session.run(query);

    return result.records.map((record) => ({
      id: record.get("id"),
      origin: record.get("origin"),
      destination: record.get("destination"),
      startTime: record.get("startTime"),
      endTime: record.get("endTime"),
      stops: record.get("stops"),
      isActive: record.get("isActive"),
    }));
  } finally {
    await session.close();
  }
}
