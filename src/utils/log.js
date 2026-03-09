import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config({ path: 'C:\\Automacoes\\Multas\\Multas_29-Finalizacao-T12\\config\\.env' });

export class Logger {
    constructor() {
        this.now = new Date().toISOString().split('T')[0];

        this.logPathEquipe = process.env.logEquipe;
        this.logPathOperacao = process.env.logOperacao;

        this.logFileEquipe = path.resolve(this.logPathEquipe, `Log-${this.now}.txt`);
        this.logFileOperacao = path.resolve(this.logPathOperacao, `Log-${this.now}.txt`);
    }

    async _formatLine(message, type) {
        const now = new Date().toLocaleTimeString();

        const typeLabel = String(type).padEnd(6, ' ') + ':';

        const prefix = `| ${typeLabel} ${now} |`;

        const totalLength = 100;
        const spaceForContent = totalLength - prefix.length - 2;

        const maxMessageLength = spaceForContent;
        const trimmedMessage = message.length > maxMessageLength
            ? message.slice(0, maxMessageLength)
            : message;

        const dashTotal = spaceForContent - trimmedMessage.length;
        const dashLeft = 0
        const dashRight = dashTotal;

        const middle = `${' '.repeat(dashLeft)} ${trimmedMessage} ${' '.repeat(dashRight)}`;
        const finalLine = `${prefix} ${middle} |`;

        return finalLine
    }

    async _writeToFileEquipe(formattedMessage) {
        fs.appendFileSync(this.logFileEquipe, formattedMessage + '\n', 'utf-8');
    }

    async _writeToFileOperacao(formattedMessage) {
        fs.appendFileSync(this.logFileOperacao, formattedMessage + '\n', 'utf-8');
    }

    async log(message) {
        let formattedMessage = await this._formatLine(message, 'INFO');
        await this._writeToFileOperacao(formattedMessage)
        console.log('\x1b[32m' + formattedMessage + '\x1b[0m');
    }

    async error(message, error) {
        let formattedMessage = await this._formatLine(message, 'ERROR')
        console.error('\x1b[31m' + formattedMessage + '\x1b[0m');
        console.error('\x1b[31m' + error + '\x1b[0m');
        this._writeToFileEquipe(formattedMessage)
        this._writeToFileEquipe(error);
    }

    async warn(message) {
        let formattedMessage = await this._formatLine(message, 'WARN');
        await this._writeToFileOperacao(formattedMessage)
        console.warn('\x1b[33m' + formattedMessage + '\x1b[0m');
    }
}