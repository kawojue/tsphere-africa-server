import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 2005
  const app = await NestFactory.create(AppModule)
  const expressApp = app.getHttpAdapter().getInstance()

  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,PATCH,POST,PUT,DELETE',
    credentials: true
  })
  expressApp.set('trust proxy', true)
  app.useGlobalPipes(new ValidationPipe())
  app.setGlobalPrefix('/api')

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Talent Sphere Africa API')
    .setDescription('API Endpoints')
    .setVersion('1.0.1')
    .addServer(`http://localhost:${PORT}/`, 'Local environment')
    .addServer(`https://tsphere-backend.onrender.com`, 'Development')
    .addBearerAuth()
    .addTag('Routes')
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