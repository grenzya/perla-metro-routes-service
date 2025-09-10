import { createRoute, getRoutes, getRouteById, softDeleteRoute} from "../models/route.model.js";

export async function addRoute(data) {
  return await createRoute(data);
}

export async function listRoutes() {
  return await getRoutes();
}

export async function findRouteById(id) {
  return await getRouteById(id);
}

export async function deleteRoute(id) {
  return await softDeleteRoute(id);
}
