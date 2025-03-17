import { Controller, Get, Param, Post, } from '@nestjs/common';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    @Post()
    addCart() {
        return this.cartsService.createNewCart();
    }

    @Get(':cartId')
    getCart(@Param('cartId') cartId: string) {
        return this.cartsService.getCart(cartId);
    }
}
