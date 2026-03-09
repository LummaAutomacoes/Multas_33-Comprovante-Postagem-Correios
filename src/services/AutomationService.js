import puppeteer from "puppeteer";
import fs from 'fs'
import path from "path";
import { ExcelManager } from "../class/ExcelManager.js";
import { Logger } from '../utils/log.js';

export class AutomationService {
    constructor(dataExcel) {
        this.browser = null;
        this.page = null;
        this.newPage = null;
        this.frame = null;
        this.data = dataExcel;
        this.log = new Logger();
        this.headers = ['CODIGO DE RASTREIO', 'STATUS', 'ERRO'];
        this.ExcelManager = new ExcelManager(process.env.TempExcel, process.env.ReturnExcel ,this.headers);
        this.menuFrame = null;
        this.messageFrame = null;
    }



    // Função saveExcel corrigida
    async saveExcel(data, status, erro = '') {
        try {
            const dataToSave = {
                'CODIGO DE RASTREIO': data,  // data já é a string do elemento
                'STATUS': status,
                'ERRO': erro
            }

            const emInstance = new ExcelManager(process.env.TempExcel, this.headers);
            await emInstance.writeExcel(process.env.TempExcel, dataToSave);
        } catch (error) {
            this.log.error('Erro ao salvar dados no Excel', error.stack);
            throw new Error('Erro ao salvar dados no Excel');
        }
    }

    async cleanup(pdfFolder) {
        try {
            // Limpa Excel
            await this.ExcelManager.resetExcel();
            this.log.log('|------------------------Excel de retorno foi limpo-------------------------|')

            // Limpa PDFs
            const files = fs.readdirSync(pdfFolder);
            let count = 0;
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    fs.unlinkSync(path.join(pdfFolder, file));
                    count++;
                }
            }
            this.log.log('|------------------------${count} PDFs removidos-------------------------|')



        } catch (error) {
            this.log.error('Erro ao limpar arquivos', error.stack);
            throw new Error('Erro ao limpar arquivos');
        }
    }

    async getDateOneYearAndThreeMonthsAgo() {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 1);
        today.setMonth(today.getMonth() - 3);

        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();

        return `${day}/${month}/${year}`;
    }

    async getYesterday() {
        const today = new Date();
        today.setDate(today.getDate() - 1);

        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();

        return `${day}/${month}/${year}`;
    }

    async getTarget(targetName) {
        const target = await this.browser.waitForTarget(t =>
            t.url().includes(`${targetName}.php`)
        );
        return target;
    }

    async getIframe(frameName) {
        return this.page.frames().find(
            f => f.name() === frameName || f.url().includes(`${frameName}.php`)
        );
    }

    async postalPage() {
        try {
            const target = await this.getTarget('postalnet');

            const postalPage = await target.page();

            await postalPage.setViewport({
                width: 1280,
                height: 720
            });

            this.page = postalPage;
            await this.page.bringToFront();
            this.log.log('|---------------------------Aba Postal Aberto-----------------------------|');


        } catch (error) {
            this.log.log(error.stack)
        }
    }

    async actionInsertDates() {
        try {
            await this.page.waitForFrame(f => f.url().includes('menu.php'), { timeout: 30000 });
            await this.page.waitForFrame(f => f.url().includes('mensagens.php'), { timeout: 30000 });

            this.menuFrame = await this.getIframe('menu');
            this.messageFrame = await this.getIframe('mensagens');

            if (!this.menuFrame) throw new Error('Frame de menu não encontrado');
            if (!this.messageFrame) throw new Error('Frame de mensagem não encontrado');

            const relatoriosBtn = await this.menuFrame.waitForSelector('#dtree_0i0i2btn', { timeout: 30000 });
            await relatoriosBtn.click();

            const movimentoBtn = await this.menuFrame.waitForSelector('#dtree_0i0i2i0ttd', { timeout: 30000 });
            await movimentoBtn.click();

            await this.menuFrame.waitForSelector('#td01', { timeout: 30000 });
            await this.menuFrame.waitForSelector('#td02', { timeout: 30000 });

            await this.menuFrame.click('#td01', { clickCount: 3 });
            await this.menuFrame.type('#td01', await this.getDateOneYearAndThreeMonthsAgo());
            // await this.menuFrame.type('#td01', `01/03/2026`);

            this.log.log('|------------Periodo de pesquisa estabelecido----------------|')




            await new Promise(resolve => setTimeout(resolve, 2000));

            await this.menuFrame.click('#td02', { clickCount: 3 });
            await this.menuFrame.type('#td02', await this.getYesterday());

            await new Promise(resolve => setTimeout(resolve, 2000));

            await this.menuFrame.waitForSelector('#dtree_0i2ttd', { timeout: 30000 });
            await this.menuFrame.click('#dtree_0i2ttd');

        } catch (error) {
            this.log.log(error.stack);
        }
    }

    createDialogHandler(element, statusRef) {
        return async (dialog) => {
            if (dialog.type() === 'prompt') {
                await dialog.accept(element);
                return;
            }

            if (dialog.type() === 'alert') {
                statusRef.isInvalid = true;
                await dialog.accept();
            }
        };
    }

    async gerarPDF(linksmessage, element) {
        for (const link of linksmessage) {
            const texto = await this.messageFrame.evaluate(el => el.textContent.trim(), link);
            if (texto === 'Imprimir (HTML)') {
                await link.click();
                break;
            }
        }

        const targetImpressao = await this.browser.waitForTarget(t =>
            t.url().includes('imp.php')
        );
        // const targetImpressao = this.getTarget('imp.php');



        const docPage = await targetImpressao.page();

        await docPage.setViewport({
            width: 1280,
            height: 720
        });

        this.page = docPage;
        await this.page.bringToFront();

        await this.page.pdf({
            path: process.env.ReturnPDF + `${element}.pdf`,
            format: 'A4',
            landscape: true,
            printBackground: true
        });

        await docPage.close();
    }

    // Iniciar browser
    async initializeBrowser() {
        try {
            this.browser = await puppeteer.launch({ headless: false, });
            this.page = await this.browser.pages();
            this.page = this.page[0];
            this.log.log('|------------------------Navegador Iniciado---------------------------|')
            console.log('\n');

        } catch (error) {
            this.log.error('Erro ao iniciar navegador', error.stack);
            throw new Error('Erro ao iniciar navegador');
        }
    }

    //Abrir site
    async open() {
        try {
            this.log.log('|------------------------Abrindo site Postagem Correios---------------|');
            console.log('\n');

            await this.page.goto(process.env.SiteProcess, { waitUntil: 'networkidle0' });
        } catch (error) {
            this.log.error('Erro ao abrir site', error.stack);
            throw new Error('Erro ao abrir site');
        }
    }

    //Login no process
    async login() {
        try {
            console.log('\n');
            this.log.log('|------------------------Logando...-----------------------------------|');

            const username = process.env.LoginProcess;
            const password = process.env.PasswordProcess;

            // 1️⃣ Preenche login
            await this.page.waitForSelector('#txtu');
            await this.page.type('#txtu', username, { delay: 50 });

            await this.page.type('#txts', password, { delay: 50 });
            await this.page.click('#enterbutton');

            this.log.log('|------------------------Login realizado com sucesso-----------------|');
            console.log('\n');


        } catch (error) {
            this.log.error('Erro ao logar no process', error.stack);
            throw new Error('Erro ao logar no process');
        }
    }


    async mainProcess() {

        await this.cleanup(process.env.ReturnPDF);

        const loginPage = this.page;

        await this.postalPage();

        await loginPage.close();

        await new Promise(resolve => setTimeout(resolve, 2000));

        await this.actionInsertDates();

        const mainPage = this.page;

        for (let i = 0; i < this.data.length; i++) {
            this.log.log(`|-----------Iniciando consulta ${i} de ${this.data.length}-----------|`);
            console.log('\n');



            const element = this.data[i];

            const statusRef = { isInvalid: false };
            const dialogHandler = this.createDialogHandler(element, statusRef);

            mainPage.on('dialog', dialogHandler);

            await new Promise(resolve => setTimeout(resolve, 2000));

            await this.menuFrame.waitForSelector('#dtree_0i2i4font', { timeout: 30000 });
            await this.menuFrame.click('#dtree_0i2i4font');

            await new Promise(resolve => setTimeout(resolve, 2000));

            mainPage.off('dialog', dialogHandler);

            // VERIFICANDO SE CODIGO DE RASTREIO É VALIDO
            if (statusRef.isInvalid) {
                this.log.log(`|------------Elemento inválido: ${element}----------------|`);
                console.log('\n');


                await this.saveExcel(element, 'ERRO', 'Código de rastreio não possui 11 dígitos');
                continue;
            }

            this.log.log(`|------------Elemento válido: ${element}----------------|`);
            console.log('\n');



            await new Promise(resolve => setTimeout(resolve, 2000));

            const hasResult = await this.messageFrame.$('body > div:nth-child(3) > table:nth-child(3) > tbody > tr:nth-child(3) > td:nth-child(7)');

            // VERIFICANDO SE EXISTE RESULTADO DA CONSULTA
            if (!hasResult) {
                this.log.error(`|-----------Elemento sem resultado: ${element}-----------|`);
                console.log('\n');

                await this.saveExcel(element, 'ERRO', 'Código de rastreio não localizado');
                continue;
            }

            this.log.log(`|-----------Resultado encontrado, gerando PDF...-----------|`);
            console.log('\n');

            const linksmessage = await this.messageFrame.$$('a.botao1');

            await this.gerarPDF(linksmessage, element);
            this.log.log(`|-----------PDF Gerado com Sucesso...-----------|`);
            console.log('\n');

            // PDF gerado com sucesso
            await this.saveExcel(element, 'SUCESSO');
            await mainPage.bringToFront();
        }

        mainPage.close();
    }
}
