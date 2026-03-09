import XLSX from 'xlsx'
import fs from 'fs'
import fs2 from 'fs/promises'

export class ExcelManager {
    constructor(filePath,filePathReturn, headers) {
        this.filePath = filePath;
        this.filePathReturn = filePathReturn
        this.headers = headers;
    }

    async readExcel() {
        if (!fs.existsSync(this.filePath)) {
            throw new Error('File not found!');
        }
        const workbook = XLSX.readFile(this.filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: this.headers });
        return jsonData;
    }

    async writeExcel(path, data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Invalid data format. Expected an object.');
        }

        let workbook;
        let worksheet;
        if (fs.existsSync(path)) {
            workbook = XLSX.readFile(path);
            worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            jsonData.push(data);
            worksheet = XLSX.utils.json_to_sheet(jsonData);
        } else {
            workbook = XLSX.utils.book_new();
            const jsonData = [data];
            worksheet = XLSX.utils.json_to_sheet(jsonData, { header: this.headers });
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        }
        workbook.Sheets[workbook.SheetNames[0]] = worksheet;
        XLSX.writeFile(workbook, path);
    }

    async resetExcel() {
        if (fs.existsSync(this.filePath) && fs.existsSync(this.filePathReturn)) {
            fs.unlinkSync(this.filePath);
            fs.unlinkSync(this.filePathReturn);
        }
    }
}
