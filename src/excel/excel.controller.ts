import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ExcelService } from "./excel.service";
import { ExcelFileResponse } from "./excel.dto";

@ApiTags("excel")
@Controller("excel")
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Get("data")
  @ApiOperation({ summary: "Read Excel file" })
  @ApiResponse({
    status: 200,
    description: "Returns data from data-chunk.xlsx",
  })
  readFile(): ExcelFileResponse {
    return this.excelService.readExcelFile();
  }
}
