import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    @Post()
    addCart() {
        return this.cartsService.createNewCart();
    }

    @Post(':id/order')
    createOrder(@Param('id') cartId: string) {
        return this.cartsService.createOrder(cartId);
    }

    @Get(':cartId')
    getCart(@Param('cartId') cartId: string) {
        return this.cartsService.getCart(cartId);
    }

    @Put(':cartId')
    async updateCart(@Param('cartId') cartId: string, @Body() cartItem: any) {
        if (cartItem.action === 'AddLineItem') {
            return this.cartsService.addLineItem(cartId, cartItem);
        }

        if (cartItem.action === 'ChangeLineItemQuantity') {
            return this.cartsService.changeLineItemQuantity(cartId, cartItem);
        }

        if (cartItem.action === 'RemoveLineItem') {
            return this.cartsService.removeLineItem(cartId, cartItem);
        }

        if (cartItem.action === 'SetShippingAddress') {
            return this.cartsService.setShippingAddress(cartId, cartItem);
        }
    }
}
