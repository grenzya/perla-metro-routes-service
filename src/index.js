import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routeRoutes from "./routes/route.routes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Endpoints del servicio de rutas
app.use("/api/routes", routeRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Route Service corriendo en http://localhost:${PORT}`);
});
