import {
  createRoute,
  getRoutes,
  getRouteById,
  updateRoute,
  softDeleteRoute,
} from "../models/route.model.js";

/**
 * Agrega una nueva ruta
 * @param {*} data Datos de la ruta
 * @returns ruta creada
 */
export async function addRoute(data) {
  return await createRoute(data);
}

/**
 * Lista todas las rutas activas
 * @returns Lista de rutas
 */
export async function listRoutes() {
  return await getRoutes();
}

/**
 * Obtiene una ruta por su ID
 * @param {*} id id de la ruta
 * @returns La ruta con el ID especificado o null si no existe
 */
export async function findRouteById(id) {
  return await getRouteById(id);
}

/**
 * Actualiza una ruta existente
 * @param {*} id id de la ruta a actualizar
 * @param {*} data nuevos datos de la ruta
 * @returns La ruta actualizada o null si no existe
 */
export async function editRoute(id, data) {
  return await updateRoute(id, data);
}

/**
 * Elimina una ruta existente
 * @param {*} id id de la ruta a eliminar
 * @returns La ruta eliminada o null si no existe
 */
export async function deleteRoute(id) {
  return await softDeleteRoute(id);
}
