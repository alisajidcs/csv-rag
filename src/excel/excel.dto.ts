export interface ExcelFileResponse {
  filename: string;
  sheetName: string;
  rowCount: number;
  data: any[];
}
