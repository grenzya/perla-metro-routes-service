import { driver } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

/**
 * Crea una nueva ruta en la base de datos
 * @param {*} param0 Datos de la ruta
 * @returns La ruta creada
 */
export async function createRoute({
  originId,
  destinationId,
  stopsIds = [],
  startTime,
  endTime,
  isActive,
}) {
  // validar horarios
  if (startTime >= endTime) {
    throw new Error(
      "El horario de inicio debe ser menor que el horario de término"
    );
  }

  // validar estaciones en el otro servicio
  const originStation = await axios
    .get(`${process.env.STATIONS_SERVICE_URL}/${originId}`)
    .then((r) => r.data)
    .catch(() => null);
  const destinationStation = await axios
    .get(`${process.env.STATIONS_SERVICE_URL}/${destinationId}`)
    .then((r) => r.data)
    .catch(() => null);

  console.log("Origin station:", originStation);
  console.log("Destination station:", destinationStation);

  if (!originStation || !destinationStation) {
    throw new Error("La estación de origen o destino no existe");
  }
  if (originStation.id === destinationStation.id) {
    throw new Error("La estación de origen y destino no pueden ser iguales");
  }

  // validar stops
  const stopsStations = [];
  for (const stopId of stopsIds) {
    const stopStation = await axios
      .get(`${process.env.STATIONS_SERVICE_URL}/${stopId}`)
      .then((r) => r.data)
      .catch(() => null);
    if (!stopStation)
      throw new Error(`La estación intermedia ${stopId} no existe`);
    stopsStations.push(stopStation);
  }

  const session = driver.session();
  const routeId = uuidv4();

  try {
    // comprobar duplicados en Neo4j
    const checkQuery = `
      MATCH (r:Route {isActive: true})
      OPTIONAL MATCH (r)-[:STARTS_AT]->(o:Station)
      OPTIONAL MATCH (r)-[:ENDS_AT]->(d:Station)
      OPTIONAL MATCH (r)-[:STOPS_AT]->(s:Station)
      WHERE o.id = $originId AND d.id = $destinationId
      WITH r, collect(s.id) AS existingStops
      WHERE existingStops = $stopsIds
      RETURN r LIMIT 1
    `;
    const existing = await session.run(checkQuery, {
      originId,
      destinationId,
      stopsIds,
    });
    if (existing.records.length > 0) {
      throw new Error("Ya existe una ruta idéntica activa");
    }

    // crear ruta en Neo4j usando IDs y nombres de las estaciones
    const query = `
      CREATE (r:Route {
        id: $routeId,
        startTime: $startTime,
        endTime: $endTime,
        isActive: $isActive
      })
      MERGE (o:Station {id: $originId})
      ON CREATE SET o.name = $originName, o.type = "origen"
      MERGE (d:Station {id: $destinationId})
      ON CREATE SET d.name = $destinationName, d.type = "destino"
      CREATE (r)-[:STARTS_AT]->(o)
      CREATE (r)-[:ENDS_AT]->(d)
      WITH r, $originName AS originName, $destinationName AS destinationName, $stops AS stops
      FOREACH (stopData IN stops |
      MERGE (s:Station {id: stopData.id})
      ON CREATE SET s.name = stopData.name, s.type = "intermedia"
      CREATE (r)-[:STOPS_AT]->(s)
      )
      RETURN r {.*, origin: originName, destination: destinationName, stops: [stop IN stops | stop.name]} AS route
    `;

    const result = await session.run(query, {
      routeId,
      startTime,
      endTime,
      isActive,
      originId: originStation.id,
      originName: originStation.name,
      destinationId: destinationStation.id,
      destinationName: destinationStation.name,
      stops: stopsStations.map((s) => ({ id: s.id, name: s.name })) || [],
      stopsIds: stopsStations.map((s) => s.id) || [],
    });

    if (result.records.length === 0) {
      throw new Error("No se pudo crear la ruta en Neo4j");
    }

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
  { originId, destinationId, stopsIds = [], startTime, endTime }
) {
  const session = driver.session();

  try {
    console.log("🔍 Buscando ruta con id:", id);

    // Verificar si la ruta existe
    const check = await session.run(
      `MATCH (r:Route {id: $id}) RETURN r LIMIT 1`,
      { id }
    );

    if (check.records.length === 0) {
      console.log("❌ No se encontró ninguna ruta con ese id");
      return null;
    }

    console.log("✅ Ruta encontrada, procediendo a actualizar...");

    // Validar estaciones desde el servicio externo
    const originStation = await axios
      .get(`${process.env.STATIONS_SERVICE_URL}/${originId}`)
      .then((r) => r.data)
      .catch(() => null);

    const destinationStation = await axios
      .get(`${process.env.STATIONS_SERVICE_URL}/${destinationId}`)
      .then((r) => r.data)
      .catch(() => null);

    if (!originStation || !destinationStation) {
      throw new Error("La estación de origen o destino no existe");
    }

    if (originStation.id === destinationStation.id) {
      throw new Error("La estación de origen y destino no pueden ser iguales");
    }

    // Validar stops
    const stopsStations = [];
    for (const stopId of stopsIds) {
      const stopStation = await axios
        .get(`${process.env.STATIONS_SERVICE_URL}/${stopId}`)
        .then((r) => r.data)
        .catch(() => null);

      if (!stopStation) {
        throw new Error(`La estación intermedia ${stopId} no existe`);
      }

      stopsStations.push(stopStation);
    }

    // Query de actualización
    const query = `
      MATCH (r:Route {id: $id})
      SET r.startTime = $startTime,
          r.endTime = $endTime
      WITH r
      MATCH (o:Station {id: $originId})
      MATCH (d:Station {id: $destinationId})
      MERGE (r)-[:STARTS_AT]->(o)
      MERGE (r)-[:ENDS_AT]->(d)
      WITH r
      OPTIONAL MATCH (r)-[rel:STOPS_AT]->(:Station)
      DELETE rel
      WITH r
      FOREACH (stopData IN $stops |
        MERGE (s:Station {id: stopData.id})
          ON CREATE SET s.name = stopData.name, s.type = "intermedia"
        CREATE (r)-[:STOPS_AT]->(s)
      )
      RETURN r {
        .*, 
        origin: $originName, 
        destination: $destinationName, 
        stops: [stop IN $stops | stop.name]
      } AS route
    `;

    const result = await session.run(query, {
      id,
      startTime,
      endTime,
      originId: originStation.id,
      originName: originStation.name,
      destinationId: destinationStation.id,
      destinationName: destinationStation.name,
      stops: stopsStations.map((s) => ({ id: s.id, name: s.name })),
    });

    if (result.records.length === 0) {
      console.log("⚠️ No se pudo actualizar la ruta (sin resultados en Neo4j)");
      return null;
    }

    return result.records[0].get("route");
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
