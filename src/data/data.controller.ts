import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DataService } from "./data.service";
import { DataFileResponse } from "./data.dto";

@ApiTags("data")
@Controller("data")
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get("read")
  @ApiOperation({ summary: "Read CSV data file" })
  @ApiResponse({
    status: 200,
    description: "Returns data from configured CSV file",
  })
  async readFile(): Promise<DataFileResponse> {
    return this.dataService.readCSVFile();
  }
}
