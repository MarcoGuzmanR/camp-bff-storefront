import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { CartsController } from './carts/carts.controller';
import { CartsService } from './carts/carts.service';
import { PromosController } from './promos/promos.controller';
import { PromosService } from './promos/promos.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController, CategoriesController, ProductsController, CartsController, PromosController],
  providers: [AppService, CategoriesService, ProductsService, CartsService, PromosService],
})
export class AppModule {}
