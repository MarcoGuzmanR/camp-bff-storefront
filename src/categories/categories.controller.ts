import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

type Category = {
    ancestors: {
        id?: string;
        type?: string;
    }[];
    id: string;
    name: string;
    description: string;
    slug: string;
    parent?: {
        id: string;
    };
}[];

function formatCategories(categories) {
    const formattedCategories: Category = [{
        ancestors: [],
        id: String(categories.id),
        name: categories.name,
        description: categories.name,
        slug: String(categories.id),
    }];

    function traverse(item, prevAncestors) {
        formattedCategories.push({
            ancestors: [
                ...prevAncestors,
                {
                    id: String(item.parent_id),
                    type: 'category',
                },
            ],
            id: String(item.id),
            name: item.name,
            description: item.name,
            slug: String(item.id),
            parent: {
                id: String(item.parent_id),
            },
        });

        if (item.children_data && item.children_data.length > 0) {
            const prevAncestors = formattedCategories[formattedCategories.length - 1].ancestors;

            item.children_data.forEach(child => {
                traverse(child, prevAncestors);
            });
        }
    }

    categories.children_data.forEach(item => traverse(item, []));

    return formattedCategories;
}

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
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        try {
            const response = await axios.get(`${magentoUrl}/rest/V1/categories`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return formatCategories(response.data);
        }
        catch (error) {
            console.error('Error fetching categories from Magento:', error);
            throw new Error('Unable to fetch categories from Magento');
        }
    }
}
