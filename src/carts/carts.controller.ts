import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
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

    @Put(':cartId')
    async addLineItem(@Param('cartId') cartId: string, @Body() cartItem: any) {
      return this.cartsService.addLineItem(cartId, cartItem);
    }
}
