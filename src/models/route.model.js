import { driver } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Crea una nueva ruta en la base de datos
 * @param {*} param0 Datos de la ruta
 * @returns La ruta creada
 */
export async function createRoute({
  origin,
  destination,
  stops = [],
  startTime,
  endTime,
  isActive,
}) {
  if (origin === destination) {
    throw new Error("La estación de origen y destino no pueden ser iguales");
  }

  if (startTime >= endTime) {
    throw new Error(
      "El horario de inicio debe ser menor que el horario de término"
    );
  }

  const session = driver.session();
  const routeId = uuidv4();

  try {
    const checkQuery = `
      MATCH (r:Route {isActive: true})
      OPTIONAL MATCH (r)-[:STARTS_AT]->(o:Station)
      OPTIONAL MATCH (r)-[:ENDS_AT]->(d:Station)
      OPTIONAL MATCH (r)-[:STOPS_AT]->(s:Station)
      WHERE o.name = $origin AND d.name = $destination AND r.startTime = $startTime AND r.endTime = $endTime
      WITH r, collect(s.name) AS existingStops
      WHERE existingStops = $stops
      RETURN r LIMIT 1
    `;

    const existing = await session.run(checkQuery, {
      origin,
      destination,
      startTime,
      endTime,
      stops,
    });

    if (existing.records.length > 0) {
      throw new Error("Ya existe una ruta idéntica activa");
    }

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

/**
 * Lista todas las rutas activas
 * @returns Lista todas las rutas activas
 */
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
/**
 * Obtiene una ruta por su ID
 * @param {*} id ID de la ruta
 * @returns La ruta con el ID especificado o null si no existe
 */
export async function getRouteById(id) {
  const session = driver.session();
  try {
    const query = `
      MATCH (r:Route {id: $id, isActive: true})
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
    const result = await session.run(query, { id });

    if (result.records.length === 0) return null;

    const record = result.records[0];
    return {
      id: record.get("id"),
      origin: record.get("origin"),
      destination: record.get("destination"),
      startTime: record.get("startTime"),
      endTime: record.get("endTime"),
    };
  } finally {
    await session.close();
  }
}

/**
 * Actualiza una ruta existente
 * @param {*} id el ID de la ruta a actualizar
 * @param {*} param1 el objeto con los nuevos datos de la ruta
 * @returns Ruta actualizada o null si no existe
 */
export async function updateRoute(
  id,
  { origin, destination, startTime, endTime, stops, isActive }
) {
  const session = driver.session();
  try {
    // 1. Traer la ruta actual para tener valores por defecto
    const currentQuery = `
      MATCH (r:Route {id: $id})
      OPTIONAL MATCH (r)-[:STARTS_AT]->(o:Station)
      OPTIONAL MATCH (r)-[:ENDS_AT]->(d:Station)
      OPTIONAL MATCH (r)-[:STOPS_AT]->(s:Station)
      RETURN r.startTime AS startTime,
             r.endTime AS endTime,
             r.isActive AS isActive,
             o.name AS origin,
             d.name AS destination,
             collect(s.name) AS stops
    `;
    const currentResult = await session.run(currentQuery, { id });
    if (currentResult.records.length === 0) {
      await session.close();
      return null;
    }
    const current = currentResult.records[0];

    origin = origin ?? current.get("origin");
    destination = destination ?? current.get("destination");
    startTime = startTime ?? current.get("startTime");
    endTime = endTime ?? current.get("endTime");
    stops = (stops && stops.length ? stops : current.get("stops")) ?? [];
    isActive = isActive ?? current.get("isActive");

    if (origin === destination) {
      throw new Error("La estación de origen y destino no pueden ser iguales");
    }
    if (startTime >= endTime) {
      throw new Error(
        "El horario de inicio debe ser menor que el horario de término"
      );
    }

    const checkQuery = `
      MATCH (r:Route {isActive: true})
      OPTIONAL MATCH (r)-[:STARTS_AT]->(o:Station)
      OPTIONAL MATCH (r)-[:ENDS_AT]->(d:Station)
      OPTIONAL MATCH (r)-[:STOPS_AT]->(s:Station)
      WHERE o.name = $origin AND d.name = $destination AND r.startTime = $startTime AND r.endTime = $endTime AND r.id <> $id
      WITH r, collect(s.name) AS existingStops
      WHERE existingStops = $stops
      RETURN r LIMIT 1
    `;
    const existing = await session.run(checkQuery, {
      id,
      origin,
      destination,
      startTime,
      endTime,
      stops,
    });
    if (existing.records.length > 0) {
      throw new Error("Ya existe una ruta idéntica activa");
    }

    const updateQuery = `
      MATCH (r:Route {id: $id})
      SET r.startTime = $startTime,
          r.endTime = $endTime,
          r.isActive = $isActive
      WITH r
      OPTIONAL MATCH (r)-[rel1:STARTS_AT]->(:Station)
      DELETE rel1
      MERGE (o:Station {name: $origin, type: "origen"})
      CREATE (r)-[:STARTS_AT]->(o)
      WITH r
      OPTIONAL MATCH (r)-[rel2:ENDS_AT]->(:Station)
      DELETE rel2
      MERGE (d:Station {name: $destination, type: "destino"})
      CREATE (r)-[:ENDS_AT]->(d)
      WITH r
      OPTIONAL MATCH (r)-[rel3:STOPS_AT]->(:Station)
      DELETE rel3
      WITH r
      UNWIND $stops AS stopName
        MERGE (s:Station {name: stopName, type: "intermedia"})
        CREATE (r)-[:STOPS_AT]->(s)
      RETURN r.id AS id,
             r.startTime AS startTime,
             r.endTime AS endTime,
             r.isActive AS isActive,
             $origin AS origin,
             $destination AS destination,
             $stops AS stops
    `;

    const result = await session.run(updateQuery, {
      id,
      origin,
      destination,
      startTime,
      endTime,
      stops,
      isActive,
    });

    const record = result.records[0];
    return {
      id: record.get("id"),
      origin: record.get("origin"),
      destination: record.get("destination"),
      startTime: record.get("startTime"),
      endTime: record.get("endTime"),
      stops: record.get("stops"),
      isActive: record.get("isActive"),
    };
  } finally {
    await session.close();
  }
}

/**
 * Elimina una ruta SOFTDELETE, es decir, cambia su estado a inactivo
 * @param {*} id ID de la ruta
 * @returns La ruta eliminada o null si no existe
 */
export async function softDeleteRoute(id) {
  const session = driver.session();
  try {
    const query = `
      MATCH (r:Route {id: $id})
      SET r.isActive = false
      RETURN r.id AS id, r.isActive AS isActive
    `;
    const result = await session.run(query, { id });

    if (result.records.length === 0) return null;

    return {
      id: result.records[0].get("id"),
      isActive: result.records[0].get("isActive"),
    };
  } finally {
    await session.close();
  }
}
