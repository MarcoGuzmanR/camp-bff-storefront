import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class PromosService {
    constructor(private configService: ConfigService) {}

    async getPromos(sku): Promise<any> {
        const contentStackUrl = this.configService.get<string>('CONTENTSTACK_URL');
        const contentStackApiKey = this.configService.get<string>('CONTENTSTACK_API_KEY');
        const contentStackAccessToken = this.configService.get<string>('CONTENTSTACK_ACCESS_TOKEN');
        const headers = {
            'Content-Type': 'application/json',
            'api_key': contentStackApiKey,
            'access_token': contentStackAccessToken,
        }

        try {
            const response = await axios.get(`${contentStackUrl}/content_types/product/entries`, {
                headers,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            const promos = response.data.entries[0].promo_section.map((promo, index) => {
                return {
                    text: promo.promo_text.title,
                    order: index + 1,
                }
            });

            return {
                sku,
                promos,
            };
        }
        catch (error) {
            console.error('Error fetching promos:', error);
            throw new Error('Unable to fetch promos');
        }
    }
}
