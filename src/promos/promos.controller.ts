import { Controller, Get, Param } from '@nestjs/common';
import { PromosService } from './promos.service';

@Controller('promos')
export class PromosController {
    constructor(private readonly promosService: PromosService) { }

    @Get(':sku')
    getPromos(@Param('sku') sku: string) {
        return this.promosService.getPromos(sku);
    }
}
