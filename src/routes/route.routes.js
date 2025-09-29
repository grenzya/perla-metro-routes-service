import express from "express";
import {
  addRoute,
  listRoutes,
  findRouteById,
  editRoute,
  deleteRoute,
} from "../services/route.service.js";

const router = express.Router();

/**
 * Crear una nueva ruta
 */
router.post("/", async (req, res) => {
  try {
    const { originId, destinationId, stopsIds, startTime, endTime, isActive } =
      req.body;

    if (!originId || !destinationId || !startTime || !endTime) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const newRoute = await addRoute({
      originId,
      destinationId,
      stopsIds: stopsIds || [],
      startTime,
      endTime,
      isActive: isActive ?? true,
    });

    res.status(201).json(newRoute);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Listar todas las rutas
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

/**
 * Obtener ruta por ID
 */
router.get("/:id", async (req, res) => {
  try {
    const route = await findRouteById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }
    res.json(route);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error obteniendo la ruta", details: err.message });
  }
});

/**
 * Actualizar una ruta por ID
 */
router.put("/:id", async (req, res) => {
  try {
    const { originId, destinationId, startTime, endTime, stopsIds } = req.body;

    if (!originId || !destinationId || !startTime || !endTime || !stopsIds) {
      return res.status(400).json({
        error:
          "Se deben proporcionar todos los campos: originId, destinationId, startTime, endTime y stopsIds",
      });
    }

    const updatedRoute = await editRoute(req.params.id, {
      originId,
      destinationId,
      startTime,
      endTime,
      stopsIds,
    });

    if (!updatedRoute) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }

    res.json(updatedRoute);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Eliminar (soft delete) una ruta por ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const deletedRoute = await deleteRoute(req.params.id);
    if (!deletedRoute) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }
    res.json({ message: "Ruta eliminada (soft delete)", route: deletedRoute });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error eliminando ruta", details: err.message });
  }
});

export default router;
