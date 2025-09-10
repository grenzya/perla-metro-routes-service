import express from "express";
import { addRoute } from "../services/route.service.js";
import { listRoutes } from "../services/route.service.js";

const router = express.Router();

/**
 * Crear una nueva ruta
 */
router.post("/", async (req, res) => {
  try {
    const { origin, destination, stops, startTime, endTime, isActive } =
      req.body;

    if (!origin || !destination || !startTime || !endTime) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const newRoute = await addRoute({
      origin,
      destination,
      stops,
      startTime,
      endTime,
      isActive: isActive ?? true, // por defecto activa
    });

    res.status(201).json(newRoute);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Error creando la ruta", details: err.message });
  }
});

/**
 * Listar todas las rutas que son activas q por ahora es in middleware para probar xd
 */
router.get("/", async (req, res) => {
  try {
    const routes = await listRoutes();
    res.json(routes);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error listando rutas", details: err.message });
  }
});

export default router;
