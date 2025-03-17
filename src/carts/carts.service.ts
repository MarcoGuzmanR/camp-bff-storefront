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

    async createNewCart(): Promise<string> {
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

            return response.data;
        }
        catch (error) {
            console.error('Error on creating a new cart:', error);
            throw new Error('Unable to create a cart');
        }
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

            return response.data;
        }
        catch (error) {
            console.error('Error on creating a new cart:', error);
            throw new Error('Unable to create a cart');
        }
    }
}
