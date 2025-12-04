import { Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { ExcelFileResponse } from "./excel.dto";

@Injectable()
export class ExcelService {
  private readonly dataFileName = process.env.DATA_FILE || "";
  private readonly dataFilePath = path.join(
    process.cwd(),
    "data",
    this.dataFileName,
  );

  /**
   * Read the Excel file and return its data
   */
  readExcelFile(): ExcelFileResponse {
    try {
      // Check if file exists
      if (!this.dataFileName) {
        throw new Error("file name environment variable is not set");
      }

      if (!fs.existsSync(this.dataFilePath)) {
        throw new Error(`File not found: ${this.dataFileName}`);
      }

      // Read the file
      const workbook = XLSX.readFile(this.dataFilePath);

      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      return {
        filename: this.dataFileName,
        sheetName,
        rowCount: data.length,
        data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error reading Excel file: ${message}`);
    }
  }
}
