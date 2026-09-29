/**
 * @file server/db/mariadb.ts
 * MariaDB / MySQL Connection Pool & Driver Adapter.
 * Implements the ISqliteDb interface for transparent plug-and-play database switching.
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import type { ISqliteDb } from './database.js';

export interface MariaDbConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    connectionLimit?: number;
    ssl?: any;
}

export class MariaDbWrapper implements ISqliteDb {
    private pool: mysql.Pool;

    constructor(config?: MariaDbConfig) {
        this.pool = mysql.createPool({
            host: config?.host || process.env.DB_HOST || 'localhost',
            port: config?.port || Number(process.env.DB_PORT) || 3306,
            user: config?.user || process.env.DB_USER || 'workflow_user',
            password: config?.password || process.env.DB_PASSWORD || 'workflow_password',
            database: config?.database || process.env.DB_NAME || 'workflow_db',
            waitForConnections: true,
            connectionLimit: config?.connectionLimit || 15,
            queueLimit: 0,
            multipleStatements: true,
            decimalNumbers: true,
            dateStrings: true,
            charset: 'utf8mb4'
        });
    }

    async exec(sql: string): Promise<void> {
        await this.pool.query(sql);
    }

    async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const [rows] = await this.pool.execute(sql, flatParams);
        if (Array.isArray(rows) && rows.length > 0) {
            return rows[0] as T;
        }
        return undefined;
    }

    async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const [rows] = await this.pool.execute(sql, flatParams);
        return rows as T[];
    }

    async run(sql: string, ...params: any[]): Promise<{ changes: number; lastID: number }> {
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const [result] = await this.pool.execute(sql, flatParams);
        const header = result as mysql.ResultSetHeader;
        return {
            changes: header.affectedRows || 0,
            lastID: header.insertId || 0
        };
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    /**
     * Initializes the MariaDB schema using the dedicated scripts/init-mariadb.sql script
     */
    async initializeSchema(): Promise<void> {
        const initScriptPath = path.resolve(process.cwd(), 'scripts', 'init-mariadb.sql');
        if (fs.existsSync(initScriptPath)) {
            const sql = fs.readFileSync(initScriptPath, 'utf8');
            await this.pool.query(sql);
        }
    }
}
