import fs from "fs";
import path from "path";
import { addRoute } from "../src/services/route.service.js";

async function seedRoutes() {
  try {
    const filePath = path.resolve("./seeds/routes.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const routes = JSON.parse(data);

    for (const route of routes) {
      try {
        const createdRoute = await addRoute(route);
        console.log("Ruta creada:", createdRoute.id);
      } catch (err) {
        console.error("Error creando ruta:", err.message);
      }
    }

    console.log("Seeder finalizado");
    process.exit(0);
  } catch (err) {
    console.error("Error leyendo JSON:", err.message);
    process.exit(1);
  }
}

seedRoutes();
