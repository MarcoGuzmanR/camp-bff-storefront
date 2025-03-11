import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class ProductsService {
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

    private getProductsURLWithParams({ categoryId, offset, limit }) {
        const VISIBILITY_HIDDEN = 1;
        const queryParams = new URLSearchParams();
        queryParams.set(
            'searchCriteria[filter_groups][0][filters][0][field]',
            'category_id',
        );
        queryParams.set(
            'searchCriteria[filter_groups][0][filters][0][value]',
            `${categoryId}`,
        );
        queryParams.set(
            'searchCriteria[filter_groups][0][filters][0][condition_type]',
            'eq',
        );
        queryParams.set(
            'searchCriteria[filter_groups][1][filters][0][field]',
            'visibility',
        );
        queryParams.set(
            'searchCriteria[filter_groups][1][filters][0][value]',
            `${VISIBILITY_HIDDEN}`,
        );
        queryParams.set(
            'searchCriteria[filter_groups][1][filters][0][condition_type]',
            'neq',
        );

        if (offset) {
            queryParams.set(
                'searchCriteria[currentPage]',
                `${offset}`,
            );
        }

        if (limit) {
            queryParams.set('searchCriteria[pageSize]', limit.toString());
        }

        return `products?${queryParams.toString()}`;
    }

    async getProducts(params): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();
        const productsURLWithParams = this.getProductsURLWithParams(params);

        try {
            const response = await axios.get(`${magentoUrl}/rest/V1/${productsURLWithParams}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return {
                total: response.data?.total_count,
                results: response.data?.items,
                searchCriteria: response.data?.search_criteria,
            };
        }
        catch (error) {
            console.error('Error fetching products from Magento:', error);
            throw new Error('Unable to fetch products from Magento');
        }
    }

    async getProductBySku(sku: string): Promise<any> {
        const magentoUrl = this.configService.get<string>('MAGENTO_URL');
        const adminToken = await this.getAdminToken();

        try {
            const response = await axios.get(`${magentoUrl}/rest/V1/products/${sku}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            return response.data;
        }

        catch (error) {
            console.error('Error fetching a product from Magento:', error);
            throw new Error('Unable to fetch a product from Magento');
        }
    }
}
