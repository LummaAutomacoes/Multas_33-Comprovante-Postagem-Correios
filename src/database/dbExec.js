import pool from "./poolExec.js";

export class ExecDatabase {
    constructor() {
        this.vm = process.env.vm
        this.num_automacao = process.env.idAuto
        this.nome_automacao = process.env.nameAuto
        this.departamento = process.env.departamento
    }
    async insertInicioAutomacao(
        hora_inicio,
        status,
        tipo
    ) {
        const query = `
            INSERT INTO exec.exec_automacoes (
                num_automacao,
                nome_automacao,
                departamento,
                hora_inicio,
                status,
                vm,
                tipo
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )
        `;

        const values = [
            this.num_automacao,
            this.nome_automacao,
            this.departamento,
            hora_inicio,
            status,
            this.vm,
            tipo
        ];

        try {
            await pool.query(query, values);
            console.log('Dados da automação inseridos com sucesso!');
        } catch (err) {
            console.error('Erro ao inserir dados na tabela exec_automacoes:', err);
        }
    };

    async getUltimaAutomacaoId() {
        const query = `
            SELECT id
            FROM exec.exec_automacoes
            WHERE num_automacao = $1 and departamento = $2
            ORDER BY hora_inicio DESC
            LIMIT 1
        `;

        try {
            const res = await pool.query(query, [this.num_automacao, this.departamento]);
            if (res.rows.length > 0) {
                return res.rows[0].id;
            } else {
                console.log('Nenhuma automação encontrada.');
                return null;
            }
        } catch (err) {
            console.error('Erro ao buscar o ID da automação mais recente:', err);
            throw err;
        }
    };

    async updateFimAutomacao(id, hora_termino, duracao, qtd_registros, status) {
        const query = `
            UPDATE exec.exec_automacoes
            SET
                hora_termino = $1,
                duracao = $2,
                qtd_registros = $3,
                status = $4
            WHERE id = $5
        `;

        const values = [hora_termino, duracao, qtd_registros, status, id];

        try {
            const res = await pool.query(query, values);
            if (res.rowCount > 0) {
                console.log(`Automação com ID ${id} atualizada com sucesso.`);
                await pool.end();
            } else {
                console.log(`Nenhuma automação encontrada com ID ${id}.`);
            }
        } catch (err) {
            console.error('Erro ao atualizar dados da automação:', err);
            throw err;
        }
    };

    async insertStatusAutomacao(
        chave,
        status,
        type_status,
        conclusao,
        hora
    ) {
        const query = `
            INSERT INTO exec.exec_status_automacoes (
                chave,
                num_automacao,
                nome_automacao,
                departamento,
                status,
                type_status,
                conclusao,
                hora
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,$8
            )
        `;

        const values = [
            chave,
            this.num_automacao,
            this.nome_automacao,
            this.departamento,
            status,
            type_status,
            conclusao,
            hora
        ];

        try {
            await pool.query(query, values);
            console.log(`Status da automação (ID ${chave}) inserido com sucesso.`);
        } catch (err) {
            console.error('Erro ao inserir status da automação:', err);
            throw err;
        }
    }
}