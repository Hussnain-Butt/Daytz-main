const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
import express, { Express } from "express";
const app: Express = express();

/**
 * Setup Swagger documentation
 * @param {express.Application} app - The Express application instance
 */
export function setupSwagger(app: express.Application) {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
        description: "Automatically generated API documentation using Swagger",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local Development Server",
        },
      ],
    },
    apis: ["./src/routes.ts"]
  };

  const specs = swaggerJsdoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  console.log("Swagger documentation available at: http://localhost:3000/api-docs");
}

// Explicitly export setupSwagger with TypeScript typing
module.exports = { setupSwagger };