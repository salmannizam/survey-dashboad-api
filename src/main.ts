import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import { TimeoutInterceptor } from './common/timeout.interceptor';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // const logger = new Logger('HTTP');

  // Log every incoming request
  // app.use((req, res, next) => {
  //   logger.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  //   logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
  //   logger.debug(`Body: ${JSON.stringify(req.body)}`);
  //   next();
  // });

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,  // Automatically transform payloads to DTO instances
    whitelist: true,  // Strip properties that do not have any decorators
    forbidNonWhitelisted: true,  // Throw an error if non-whitelisted properties are found
  }));

  // Enable CORS for all origins (or you can specify specific origins)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*' ,  // Allow all origins (use this for testing, restrict for production)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',  // Allowed HTTP methods
    allowedHeaders: 'Content-Type, Authorization',  // Allowed headers
  });
  // Increase the body size limit
  app.use(bodyParser.json({ limit: '80mb' }));
  app.useGlobalInterceptors(new TimeoutInterceptor());
  await app.listen(process.env.PORT || 3002, '0.0.0.0');
}
bootstrap();
