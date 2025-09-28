# 🚇 Perla Metro – Routes Service

Servicio REST encargado de gestionar **Rutas** del sistema Perla Metro.  
Implementado en **Node.js + Express** con base de datos **Neo4j Aura**.

---

## 📋 Descripción

Este servicio expone una API REST para la gestión de rutas del metro.  
Cada ruta tiene:

- ID único (`uuid`)
- Estación de origen
- Estación de destino
- Horario de comienzo y término (`HH:mm`)
- Paradas intermedias
- Estado (`isActive` para soft delete)

Forma parte de una **arquitectura SOA** en la que cada dominio (Usuarios, Tickets, Estaciones, Rutas) es un servicio independiente y se comunican usando **HTTP/REST**.

---

## 🗂️ Estructura del proyecto

```bash
src/
├─ config/ # Configuración de Neo4j Aura y otras variables
├─ models/ # Acceso a datos (queries Cypher a Neo4j)
├─ services/ # Lógica de negocio
├─ routes/ # Rutas de Express (controladores REST)
├─ utils/ # Lógica de validación y helpers
└─ index.js # Punto de entrada del servidor Express
```

### Patrón utilizado

Se aplica **Arquitectura en Capas (Layered Architecture)**:

- **config/**: configuración global
- **models/**: patrón DAO/Repository para Neo4j
- **services/**: lógica de negocio (validaciones, orquestación)
- **routes/**: endpoints REST
- **index.js**: inicialización del servidor

Esto separa responsabilidades, facilita pruebas y cumple con el principio SRP (Single Responsibility).

---

## 🛠️ Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/grenzya/perla-metro-routes-service.git
cd perla-metro-routes-service
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear archivo (`.env`) con tus credenciales
