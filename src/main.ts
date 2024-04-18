import * as express from 'express'
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 2005
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: [
      'http://localhost:3000',
      `http://localhost:${PORT}`,
      'https://talentsphereafrica.co',
      'https://talentsphereafrica.com',
      'https://www.talentsphereafrica.co',
      'https://www.talentsphereafrica.com',
      'https://api.talentsphereafrica.co',
      'https://api.talentsphereafrica.com',
    ],
    credentials: true,
    optionsSuccessStatus: 2000,
    methods: 'GET,PATCH,POST,PUT,DELETE',
  })
  app.use(express.json({ limit: 50 << 20 }))
  app.useGlobalPipes(new ValidationPipe())

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Talent Sphere Africa API')
    .setDescription('API Endpoints')
    .setVersion('1.5.2')
    .addServer(`https://api.talentsphereafrica.co`, 'Development')
    .addServer(`https://api.talentsphereafrica.com`, 'Production')
    .addServer(`http://localhost:${PORT}/`, 'Local')
    .addBearerAuth()
    .build()

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions)
  SwaggerModule.setup('docs', app, swaggerDocument)

  try {
    await app.listen(PORT)
    console.log(`http://localhost:${PORT}`)
  } catch (err) {
    console.error(err.message)
  }
}
bootstrap()