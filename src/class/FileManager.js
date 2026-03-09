import fs from 'fs/promises';
import path from 'path';

export class FileManager {
    constructor() { }

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

    async moveFile(sourcePath, destinationPath) {
        try {
            await fs.access(sourcePath);

            const destinationDir = path.dirname(destinationPath);
            await fs.mkdir(destinationDir, { recursive: true });

            await fs.rename(sourcePath, destinationPath);
        } catch (error) {
            if (error.code === 'ENOENT') return
            throw new Error(`Error moving file: ${error.message}`);
        }
    }

    async deleteFile(filePath) {
        try {
            await fs.access(filePath);

            await fs.unlink(filePath);
        } catch (error) {
            if (error.code === 'ENOENT') return
            throw new Error(`Error deleting file: ${error.message}`);
        }
    }
}
