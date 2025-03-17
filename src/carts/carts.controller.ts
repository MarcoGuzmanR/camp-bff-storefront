import { Controller, Get, Param, Post, } from '@nestjs/common';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    @Post()
    async addCart() {
        const cartId = await this.cartsService.createNewCart();

        return {
            id: cartId,
            version: 0,
            customerId: 'customer-id',
            lineItems: [],
            totalPrice: {
                currencyCode: 'USD',
                centAmount: 0
            },
            totalQuantity: 0
        };
    }

    @Get(':cartId')
    async getCart(@Param('cartId') cartId: string) {
        const cart: any = await this.cartsService.getCart(cartId);

        return {
            id: cartId,
            version: 0,
            customerId: 'customer-id',
            lineItems: cart.items,
            totalPrice: {
                currencyCode: cart.currency.base_currency_code,
                centAmount: cart.currency.store_to_base_rate,
            },
            totalQuantity: cart.currency.store_to_quote_rate,
        };
    }
}
