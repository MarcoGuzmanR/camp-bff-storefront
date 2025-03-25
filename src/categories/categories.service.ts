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

    private async getCategoriesURL() {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';

        if (isCommerceTools) {
            const commerceToolsApiUrl = this.configService.get<string>('COMMERCETOOLS_API_URL');
            const projectKey = this.configService.get<string>('COMMERCETOOLS_PROJECT_KEY');
            const adminToken = await this.getCommerceToolsAdminToken();

            return {
                url: `${commerceToolsApiUrl}/${projectKey}/categories`,
                adminToken,
            };
        }

        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getMagentoAdminToken();

        return {
            url: `${magentoUrl}/rest/V1/categories`,
            adminToken,
        }
    }

    private formatMagentoCategories(categories) {
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

    private formatCommercetoolsCategories(categories) {
        return categories.map((category) => ({
            ...category,
            slug: category.slug['en-US'],
            name: category.name['en-US'],
        }));
    }

    async getCategories(): Promise<any> {
        const isCommerceTools = this.configService.get<string>('SET_ECOMMERCE') === 'COMMERCETOOLS';
        const { url, adminToken } = await this.getCategoriesURL();

        try {
            const response = await axios.get(`${url}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return isCommerceTools ? this.formatCommercetoolsCategories(response.data?.results) : this.formatMagentoCategories(response.data);
        }
        catch (error) {
            console.error('Error fetching categories:', error);
            throw new Error('Unable to fetch categories');
        }
    }
}
