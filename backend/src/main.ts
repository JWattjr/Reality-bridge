import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for local development (defaulting to allow frontend at http://localhost:3000)
  app.enableCors({
    origin: true, // Allow all origins for local development, or configure specifically as needed
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Proofplay NestJS backend running on: http://localhost:${port}`);
}
bootstrap();
