import * as express from 'express'
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 2005
  const app = await NestFactory.create(AppModule)
  const expressApp = app.getHttpAdapter().getInstance()

  app.enableCors({
    origin: [
      'http://localhost:3000',
      `http://localhost:${PORT}`,
      'https://talentsphereafrica.co',
      'https://talentsphereafrica.com',
      'https://sphere-theta.vercel.app',
      'https://www.talentsphereafrica.co',
      'https://api.talentsphereafrica.co',
      'https://api.talentsphereafrica.com',
      'https://www.talentsphereafrica.com',
      'https://talentsphere-staging.onrender.com',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: 'GET,PATCH,POST,PUT,DELETE',
  })
  expressApp.set('trust proxy', true)
  app.use(express.json({ limit: 100 << 20 }))
  app.useGlobalPipes(new ValidationPipe())

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Talent Sphere Africa API')
    .setDescription('API Endpoints')
    .setVersion('1.7.2')
    .addServer(`https://api.talentsphereafrica.com`, 'Production')
    .addServer(`https://api.talentsphereafrica.co`, 'Development')
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