/**
 * 手动应用数据库迁移
 * 用于 Drizzle Kit push 失败的情况
 * 运行: DATABASE_URL="mysql://user:pass@localhost:3306/dbname" npx tsx src/scripts/apply-migrations.ts
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ 请设置 DATABASE_URL 环境变量');
    console.error('   例如: DATABASE_URL="mysql://root:password@localhost:3306/walletwatch" npx tsx src/scripts/apply-migrations.ts');
    process.exit(1);
}

async function applyMigrations() {
    console.log('🚀 开始应用数据库迁migrations...\n');
    
    // TypeScript 类型断言：此时 DATABASE_URL 已经通过上面的检查确保不为 undefined
    const connection = await mysql.createConnection(DATABASE_URL!);
    
    try {
        // 读取所有迁移文件
        const migrations = [
            '0000_friendly_machine_man.sql',
            '0001_superb_husk.sql',
            '0002_complex_mockingbird.sql',
        ];
        
        for (const migrationFile of migrations) {
            console.log(`📄 应用迁移: ${migrationFile}`);
            
            const sqlPath = resolve(process.cwd(), 'drizzle', migrationFile);
            const sql = readFileSync(sqlPath, 'utf-8');
            
            // 按 statement-breakpoint 分割 SQL 语句
            const statements = sql
                .split('--> statement-breakpoint')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            for (const statement of statements) {
                try {
                    await connection.query(statement);
                    console.log(`  ✅ 执行成功`);
                } catch (error: any) {
                    // 忽略 "已存在" 错误
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.message.includes('already exists')) {
                        console.log(`  ⏭️  跳过（已存在）`);
                    } else {
                        console.error(`  ❌ 执行失败:`, error.message);
                        throw error;
                    }
                }
            }
            
            console.log('');
        }
        
        console.log('✅ 所有迁移应用完成！\n');
        
        // 验证表已创建
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`📊 当前数据库表 (${(tables as any[]).length} 个):`);
        (tables as any[]).forEach((row: any) => {
            console.log(`   - ${Object.values(row)[0]}`);
        });
        
    } catch (error: any) {
        console.error('\n❌ 迁移失败:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

applyMigrations();

