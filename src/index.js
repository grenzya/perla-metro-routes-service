import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { testNeo4j } from "./models/testNeo4j.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Route Service funcionando con Express y Neo4j");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

app.get("/neo4j", async (req, res) => {
  try {
    const msg = await testNeo4j();
    res.send(msg);
  } catch (err) {
    res.status(500).send("❌ Error conectando a Neo4j: " + err.message);
  }
});
