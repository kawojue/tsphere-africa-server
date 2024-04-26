import { IsEnum } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

enum PaymentChart {
    inflow = "inflow",
    income = "income",
    outflow = "outflow",
}

export class PaymentChartDto {
    @ApiProperty({
        enum: PaymentChart
    })
    @IsEnum(PaymentChart)
    q: PaymentChart
}