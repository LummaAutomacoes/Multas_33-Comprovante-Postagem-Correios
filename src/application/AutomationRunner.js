import { ExcelManager } from '../class/ExcelManager.js';
import { FileManager } from '../class/FileManager.js';
import { ExecDatabase } from '../database/dbExec.js';
import { AutomationService } from '../services/AutomationService.js';
import { Logger } from '../utils/log.js';

import dotenv from 'dotenv';
dotenv.config({ path: 'C:\\Automacoes\\Multas\\Multas_33-Comprovante-Postagem-Correios\\config\\.env' });

class AutomationRunner {
    constructor() {
        this.entryExcel = process.env.EntryExcel
        this.tempExcel = process.env.TempExcel
        this.returnExcel = process.env.ReturnExcel

        this.log = new Logger();
        this.db = new ExecDatabase();
    }

    async copyFile(sourcePath, destinationPath) {
        try {
            await fs.access(sourcePath);

            const destinationDir = path.dirname(destinationPath);
            await fs.mkdir(destinationDir, { recursive: true });

            await fs.copyFile(sourcePath, destinationPath);
        } catch (error) {
            if (error.code === 'ENOENT') return
            throw new Error(`Error copying file: ${error.message}`);
        }
    }

    logInitialize() {
        console.log('\n');
        this.log.log('|------------------------------------------------------------------------------|');
        this.log.log(`| Iniciando automação: 33 - Comprovante Postagem Correios`);
        this.log.log('|------------------------------------------------------------------------------|');
        console.log('\n')
    }

    logEnd() {
        console.log('\n');
        this.log.log('|------------------------------------------------------------------------------|');
        this.log.log(`| Automação finalizada!`);
        this.log.log('|------------------------------------------------------------------------------|');
        console.log('\n')
    }

    async deleteFile() {
        const fmInstance = new FileManager();
        await fmInstance.deleteFile(this.tempExcel);
        await fmInstance.deleteFile(this.returnExcel);
    }

    async readExcel() {
        const emInstance = new ExcelManager(this.entryExcel);
        return await emInstance.readExcel();
    }

    async copyExcelTemp() {
        const fmInstance = new FileManager();
        await fmInstance.copyFile(this.tempExcel, this.returnExcel);
    }


    async formatDataExcel(data) {
        const novoArray = [];
        for (const item of data) {
            const codigo = item['CODIGO RASTREIO'].replace(/BR$/, '');

            novoArray.push(codigo);
        }

        return novoArray;

    }

    async updateDatabaseStatus(idAutomacao, statusExec, status, progress) {
        let finalTime = new Date();
        await this.db.insertStatusAutomacao(idAutomacao, statusExec, status, progress, finalTime);
    }

    async main() {

        let inicio = new Date();

        await this.db.insertInicioAutomacao(inicio, 'Inicio Automacao', 'Chamado');
        const idAutomacao = await this.db.getUltimaAutomacaoId();
        await this.db.insertStatusAutomacao(idAutomacao, 'Iniciando Automação', 'OK', 0.0, inicio);

        try {
            this.logInitialize();

            await this.deleteFile

            const data = await this.readExcel();
            const dataformated = await this.formatDataExcel(data);

            await this.updateDatabaseStatus(idAutomacao, 'Lendo Excel', 'OK', 0.33);

            let runner = new AutomationService(dataformated);

            await runner.initializeBrowser()
            await runner.open();
            await runner.login();
            await runner.mainProcess();

            await this.updateDatabaseStatus(idAutomacao, 'Tarefas finalizadas', 'OK', 0.70);

            await this.copyExcelTemp();

            this.logEnd();

            await this.updateDatabaseStatus(idAutomacao, 'Processos Finalizados', 'OK', 1.0);

        } catch (error) {
            const finalTime = new Date();
            await this.db.insertStatusAutomacao(idAutomacao, 'Erro na Automação', 'ERRO', 0.0, finalTime);
            await this.db.updateFimAutomacao(idAutomacao, finalTime, 0, 0, 'Erro');
            throw error;
        }
    }

}

export const runAutomation = new AutomationRunner();