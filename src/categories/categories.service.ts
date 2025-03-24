import { Injectable } from '@nestjs/common';
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

@Injectable()
export class CategoriesService {
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

    private formatCategories(categories) {
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

    async getCategories(): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();
        console.log(adminToken);

        try {
            const response = await axios.get(`${magentoUrl}/rest/V1/categories`, {
            // const response = await axios.get(`https://api.us-east-2.aws.commercetools.com/camp-training/categories`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    // Authorization: `Bearer LFyqpa4AXAa-eKfOSC0mXJrV-AmjT3os`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            // return response.data?.results;
            return this.formatCategories(response.data);
        }
        catch (error) {
            console.error('Error fetching categories from Magento:', error);
            throw new Error('Unable to fetch categories from Magento');
        }
    }
}
