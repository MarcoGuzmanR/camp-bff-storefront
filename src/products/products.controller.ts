import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    getProducts(
        @Query('categoryId') categoryId: string,
        @Query('offset') offset: string,
        @Query('limit') limit: string,
    ) {
        const categoryIdNumber = categoryId ? categoryId : null;
        const offsetNumber = offset ? parseInt(offset) : 0;
        const limitNumber = limit ? parseInt(limit) : 10;

        return this.productsService.getProducts({
            categoryId: categoryIdNumber,
            offset: offsetNumber,
            limit: limitNumber,
        });
    }

    @Get(':sku')
    getProductBySku(@Param('sku') sku: string) {
        return this.productsService.getProductBySku(sku);
    }
}
