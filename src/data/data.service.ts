import { Injectable } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import * as csv from "csv-parser";
import { DataFileResponse } from "./data.dto";

@Injectable()
export class DataService {
  private readonly dataFileName = process.env.DATA_FILE || "";
  private readonly dataFilePath = path.join(
    process.cwd(),
    "data",
    this.dataFileName,
  );

  /**
   * Read CSV file
   */
  async readCSVFile(): Promise<DataFileResponse> {
    try {
      if (!this.dataFileName) {
        throw new Error("DATA_FILE environment variable is not set");
      }

      const csvFilePath = this.dataFilePath.replace(/\.xlsx?$/i, ".csv");

      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      const stats = fs.statSync(csvFilePath);
      console.log(`CSV file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      const data: any[] = [];

      return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on("data", (row) => {
            data.push(row);
          })
          .on("end", () => {
            console.log(`Successfully parsed ${data.length} rows from CSV`);
            resolve({
              filename: path.basename(csvFilePath),
              sheetName: "CSV",
              rowCount: data.length,
              data: [data[0]], // JUST RETURN FIRST ROW FOR TESTING PURPOSES, since data can be huge
            });
          })
          .on("error", (error) => {
            reject(new Error(`Error reading CSV file: ${error.message}`));
          });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error reading CSV file: ${message}`);
    }
  }
}
