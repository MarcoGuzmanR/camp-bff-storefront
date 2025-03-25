import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class CartsService {
    constructor(private configService: ConfigService) {}

    private async getMagentoAdminToken(): Promise<string> {
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

    private async getCommerceToolsAdminToken(): Promise<string> {
        const commerceToolsAuthUrl = this.configService.get<string>('COMMERCETOOLS_AUTH_URL');
        const projectKey = this.configService.get<string>('COMMERCETOOLS_PROJECT_KEY');
        const username = this.configService.get<string>('COMMERCETOOLS_CLIENT_ID');
        const password = this.configService.get<string>('COMMERCETOOLS_CLIENT_SECRET');

        try {
            const response = await axios.post(`${commerceToolsAuthUrl}/oauth/token`,
                null,
                {
                    params: {
                        grant_type: 'client_credentials',
                        scope: `manage_project:${projectKey}`,
                    },
                    auth: {
                        username: username as string,
                        password: password as string,
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false,
                    }),
                }
            )

            return response.data.access_token
        } catch (error) {
            console.error('Error obtaining commerceTools token:', error);
            throw new Error('Unable to obtain commerceTools token');
        }
    }

    private async getCreateNewCartURL() {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';

        if (isCommerceTools) {
            const commerceToolsApiUrl = this.configService.get<string>('COMMERCETOOLS_API_URL');
            const projectKey = this.configService.get<string>('COMMERCETOOLS_PROJECT_KEY');
            const adminToken = await this.getCommerceToolsAdminToken();

            return {
                url: `${commerceToolsApiUrl}/${projectKey}/carts`,
                adminToken,
            };
        }

        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getMagentoAdminToken();

        return {
            url: `${magentoUrl}/rest/all/V1/guest-carts`,
            adminToken,
        }
    }

    private async getCartIdURL(cartId) {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';

        if (isCommerceTools) {
            const commerceToolsApiUrl = this.configService.get<string>('COMMERCETOOLS_API_URL');
            const projectKey = this.configService.get<string>('COMMERCETOOLS_PROJECT_KEY');
            const adminToken = await this.getCommerceToolsAdminToken();

            return {
                url: `${commerceToolsApiUrl}/${projectKey}/carts/${cartId}`,
                adminToken,
            };
        }

        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getMagentoAdminToken();

        return {
            url: `${magentoUrl}/rest/all/V1/guest-carts/${cartId}`,
            adminToken,
        }
    }

    private async getAddLineItemCartURL(cartId) {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';

        if (isCommerceTools) {
            const commerceToolsApiUrl = this.configService.get<string>('COMMERCETOOLS_API_URL');
            const projectKey = this.configService.get<string>('COMMERCETOOLS_PROJECT_KEY');
            const adminToken = await this.getCommerceToolsAdminToken();

            return {
                url: `${commerceToolsApiUrl}/${projectKey}/carts/${cartId}`,
                adminToken,
            };
        }

        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getMagentoAdminToken();

        return {
            url: `${magentoUrl}/rest/all/V1/guest-carts/${cartId}/items`,
            adminToken,
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
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';
        const { url, adminToken } = await this.getCreateNewCartURL();
        const payload = isCommerceTools ? { currency: 'USD' } : {};

        try {
            const response = await axios.post(`${url}`, payload, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (isCommerceTools) {
                return response.data;
            }

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
        const adminToken = await this.getMagentoAdminToken();

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
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';
        const { url, adminToken } = await this.getCartIdURL(cartId);

        try {
            const response = await axios.get(`${url}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (isCommerceTools) {
                return response.data;
            }

            const cart = response.data;

            const formattedItems = await this.getFormatItems(cart.items);
            const shippingInfoFromCart = cart.extension_attributes?.shipping_assignments[0]?.shipping;
            const street = shippingInfoFromCart?.address?.street[0]?.split(' ');
            const shippingAddress = shippingInfoFromCart.address.email ? {
                address: {
                    firstName: shippingInfoFromCart.address.firstname,
                    lastName: shippingInfoFromCart.address.lastname,
                    streetName: street.slice(0, -1).join(' '),
                    streetNumber: street[street.length - 1],
                    postalCode: shippingInfoFromCart.address.postcode,
                    region: shippingInfoFromCart.address.region,
                    city: shippingInfoFromCart.address.city,
                    country: shippingInfoFromCart.address.country_id,
                    email: shippingInfoFromCart.address.email,
                },
            } : {};

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
                ...shippingAddress,
            };
        }
        catch (error) {
            console.error('Error on creating a new cart:', error);
            throw new Error('Unable to create a cart');
        }
    }

    private async getAddLineItemPayload(cartItem) {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';
        const commerceToolsApiUrl = this.configService.get<string>('COMMERCETOOLS_API_URL');
        const projectKey = this.configService.get<string>('COMMERCETOOLS_PROJECT_KEY');
        const adminToken = await this.getCommerceToolsAdminToken();

        const sku = cartItem.AddLineItem.variantId;
        try {
            const productResponse = await axios.get(`${commerceToolsApiUrl}/${projectKey}/product-projections/search?filter=variants.key:"${sku}"`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (isCommerceTools) {
                return {
                    version: cartItem.version,
                    actions: [{
                        action: 'addLineItem',
                        productId: productResponse.data.results[0].id,
                        variantId: productResponse.data.results[0].masterVariant.id,
                        quantity: cartItem.AddLineItem.quantity,
                    }],
                }
            }

            return {
                cartItem: {
                    sku: cartItem.AddLineItem.variantId,
                    qty: cartItem.AddLineItem.quantity,
                }
            }
        }
        catch (error) {
            console.error('Error fetching a product', error);
            throw new Error('Unable to fetch a product');
        }
    }

    async addLineItem(cartId, cartItem): Promise<any> {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';
        const { url, adminToken } = await this.getAddLineItemCartURL(cartId);

        const addLineItemPayload = await this.getAddLineItemPayload(cartItem);

        try {
            const response = await axios.post(`${url}`, addLineItemPayload, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (isCommerceTools) {
                return response.data;
            }

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
        const adminToken = await this.getMagentoAdminToken();

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
        const adminToken = await this.getMagentoAdminToken();

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

    async setShippingAddress(cartId, cartItem): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getMagentoAdminToken();

        const shippingInfo = cartItem.SetShippingAddress;
        const payload = {
            addressInformation: {
                shipping_address: {
                    firstname: shippingInfo.firstName,
                    lastname: shippingInfo.lastName,
                    street: [`${shippingInfo.streetName} ${shippingInfo.streetNumber}`],
                    postcode: shippingInfo.postalCode,
                    region: shippingInfo.region,
                    city: shippingInfo.city,
                    country_id: shippingInfo.country,
                    email: shippingInfo.email,
                },
                shipping_method_code: 'flatrate',
                shipping_carrier_code: 'flatrate',
            }
        };

        try {
            const response = await axios.post(`${magentoUrl}/rest/all/V1/guest-carts/${cartId}/shipping-information`, payload, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return response?.data;
        }
        catch (error) {
            console.error('Error on adding a new item to the cart:', error);
            throw new Error('Unable to add a new item to the cart');
        }
    }

    async createOrder(cartId): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getMagentoAdminToken();

        const payload = {
            method: 'card',
        };

        try {
            const response = await axios.put(`${magentoUrl}/rest/all/V1/guest-carts/${cartId}/order`, payload, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return response?.data;
        }
        catch (error) {
            console.error('Error on creating an order:', error);
            throw new Error('Unable to create an order');
        }
    }
}
