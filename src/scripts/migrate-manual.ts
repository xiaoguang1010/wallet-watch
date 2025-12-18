import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

async function main() {
    console.log("Starting manual migration...");

    const connection = await mysql.createConnection(env.DATABASE_URL);
    console.log("Connected to database.");

    const sqlPath = path.join(process.cwd(), 'drizzle/0001_superb_husk.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    const statements = sqlContent.split('--> statement-breakpoint');

    for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
            console.log("Executing statement:");
            console.log(trimmed.substring(0, 100) + "...");
            try {
                await connection.execute(trimmed);
                console.log("Success.");
            } catch (err: any) {
                // If table already exists, it's fine, but let's log it.
                if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log("Table already exists, skipping.");
                } else if (err.code === 'ER_DUP_KEYNAME') {
                    console.log("Duplicate key/constraint, skipping.");
                } else {
                    console.error("Error executing statement:", err);
                    throw err;
                }
            }
        }
    }

    await connection.end();
    console.log("Migration completed.");
}

main().catch(console.error);
