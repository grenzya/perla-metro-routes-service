import { createRoute } from "../models/route.model.js";
import { getRoutes } from "../models/route.model.js";

export async function addRoute(data) {
  return await createRoute(data);
}

export async function listRoutes() {
  return await getRoutes();
}
