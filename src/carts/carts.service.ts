import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class CartsService {
    constructor(private configService: ConfigService) {}

    private async getAdminToken(): Promise<string> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const username = this.configService.get<string>('ADMIN');
        const password = this.configService.get<string>('PASS');

        try {
            const response = await axios.post(`${magentoUrl}/rest/V1/integration/admin/token`, {
                username,
                password,
            }, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false,
                }),
            });
            return response.data;
        } catch (error) {
            console.error('Error obtaining admin token:', error);
            throw new Error('Unable to obtain admin token');
        }
    }

    private formatVariant(product) {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');

        return {
            id: product.id,
            sku: product.sku,
            name: product.name,
            attributes: [
                {
                    name: 'Color',
                    value: {
                        key: product.custom_attributes[6]?.value,
                        label: product.name.split('-')[product.name.split('-').length - 1],
                    }
                },
                {
                    name: 'Size',
                    value: {
                        key: product.custom_attributes[5]?.value,
                        label: product.name.split('-')[product.name.split('-').length - 2],
                    }
                }
            ],
            images: [{
                url: `${magentoUrl}/pub/media/catalog/product/${product.media_gallery_entries[0]?.file}`,
            }],
            prices: [{
                value: {
                    currencyCode: 'USD',
                    centAmount: product.price * 100,
                }
            }],
        }
    }

    async createNewCart(): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        try {
            const response = await axios.post(`${magentoUrl}/rest/all/V1/guest-carts`, {}, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return {
                id: response.data,
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
        catch (error) {
            console.error('Error on creating a new cart:', error);
            throw new Error('Unable to create a cart');
        }
    }

    async getFormatItems(items): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        return await Promise.all(items.map(async (item) => {
            try {
                const productResponse = await axios.get(`${magentoUrl}/rest/V1/products/${item.sku}`, {
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                });

                const variant = this.formatVariant(productResponse?.data);

                return {
                    id: item.item_id,
                    name: item.name,
                    quantity: item.qty,
                    variant,
                    prices: variant.prices,
                    totalPrice: variant.prices[0].value.centAmount * item.qty,
                };
            }
            catch (error) {
                console.error('Error fetching a product from Magento:', error);
                throw new Error('Unable to fetch a product from Magento');
            }
        }));
    }

    async getCart(cartId): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        try {
            const response = await axios.get(`${magentoUrl}/rest/all/V1/guest-carts/${cartId}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            const cart = response.data;

            const formattedItems = await this.getFormatItems(cart.items);

            return {
                id: cartId,
                version: 0,
                customerId: 'customer-id',
                lineItems: formattedItems,
                totalPrice: {
                    currencyCode: cart.currency.base_currency_code,
                    centAmount: formattedItems.reduce((acc: number, lineItem: any) => {
                        const price = lineItem.variant?.prices?.length
                        ? lineItem.variant.prices[0]
                        : {
                            value: {
                                currencyCode: 'USD',
                                centAmount: 0
                            }
                        }

                        return acc + (lineItem.quantity || 0) * (price.value?.centAmount || 0)
                    }, 0)
                },
                totalQuantity: formattedItems.reduce((acc: number, lineItem: any) => acc + (lineItem.quantity || 0), 0),
            };
        }
        catch (error) {
            console.error('Error on creating a new cart:', error);
            throw new Error('Unable to create a cart');
        }
    }

    async addLineItem(cartId, cartItem): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        const payload = {
            cartItem: {
                sku: cartItem.AddLineItem.variantId,
                qty: cartItem.AddLineItem.quantity,
            }
        };

        try {
            const response = await axios.post(`${magentoUrl}/rest/all/V1/guest-carts/${cartId}/items`, payload, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            const formattedResponse = {
                version: cartItem.version + 1,
                ...response.data,
            };

            return formattedResponse;
        }
        catch (error) {
            console.error('Error on adding a new item to the cart:', error);
            throw new Error('Unable to add a new item to the cart');
        }
    }

    async changeLineItemQuantity(cartId, cartItem): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        const itemId = cartItem.ChangeLineItemQuantity.lineItemId;

        const payload = {
            cartItem: {
                item_id: cartItem.ChangeLineItemQuantity.lineItemId,
                qty: cartItem.ChangeLineItemQuantity.quantity,
            }
        };

        try {
            const response = await axios.put(`${magentoUrl}/rest/all/V1/guest-carts/${cartId}/items/${itemId}`, payload, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            const formattedResponse = {
                version: cartItem.version + 1,
                ...response.data,
            };

            return formattedResponse;
        }
        catch (error) {
            console.error('Error on updating an existing item to the cart:', error);
            throw new Error('Unable to update an existing to the cart');
        }
    }

    async removeLineItem(cartId, cartItem): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        const cartItemId = cartItem.RemoveLineItem.lineItemId;

        try {
            const response = await axios.delete(`${magentoUrl}/rest/all/V1/guest-carts/${cartId}/items/${cartItemId}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            const formattedResponse = {
                version: cartItem.version + 1,
                ...response.data,
            };

            return formattedResponse;
        }
        catch (error) {
            console.error('Error on removing an item to the cart:', error);
            throw new Error('Unable to remove an item to the cart');
        }
    }
}
