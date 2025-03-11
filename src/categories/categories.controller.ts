import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

@Controller('categories')
export class CategoriesController {
    constructor(private configService: ConfigService) {}

    // Function to get the Admin Token
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
                    rejectUnauthorized: false, // Disable SSL verification (for dev)
                }),
            });
            return response.data; // Admin token
        } catch (error) {
            console.error('Error obtaining admin token:', error);
            throw new Error('Unable to obtain admin token');
        }
    }

    @Get()
    async getAllCategories(): Promise<any> {
        const adminToken = await this.getAdminToken();
        console.log(adminToken);

        try {
            const response = await axios.get(`http://magento.test/rest/V1/categories`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return response.data;
        }
        catch (error) {
            console.error('Error fetching categories from Magento:', error);
            throw new Error('Unable to fetch categories from Magento');
        }
    }
}
