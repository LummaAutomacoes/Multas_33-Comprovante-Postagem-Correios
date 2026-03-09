import pg from 'pg';

import dotenv from 'dotenv';
dotenv.config({ path: 'C:\\Automacoes\\Multas\\Multas_33-Comprovante-Postagem-Correios\\config\\.env' });

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    min: 1,
    ssl: {
        rejectUnauthorized: false
    }
});

export default pool;