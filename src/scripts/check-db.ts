/**
 * 数据库状态检查脚本
 * 运行: npx tsx src/scripts/check-db.ts
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { db } from '@/data/db';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
    console.log('🔍 检查数据库状态...\n');

    try {
        // 1. 检查数据库连接
        console.log('1️⃣ 测试数据库连接...');
        const result = await db.execute(sql`SELECT 1 as test`);
        console.log('✅ 数据库连接成功\n');

        // 2. 检查当前数据库名
        console.log('2️⃣ 检查当前数据库...');
        const dbNameResult = await db.execute(sql`SELECT DATABASE() as db_name`);
        const currentDb = (dbNameResult as any)[0]?.[0]?.db_name;
        console.log(`✅ 当前数据库: ${currentDb}\n`);

        // 3. 列出所有表
        console.log('3️⃣ 检查表结构...');
        const tablesResult = await db.execute(sql`SHOW TABLES`);
        const tables = (tablesResult as any)[0];
        
        if (tables.length === 0) {
            console.log('⚠️ 数据库中没有表！');
            console.log('   请运行: npm run db:push');
            console.log('   或者: npx drizzle-kit push\n');
        } else {
            console.log(`✅ 找到 ${tables.length} 个表:`);
            tables.forEach((row: any) => {
                const tableName = Object.values(row)[0];
                console.log(`   - ${tableName}`);
            });
            console.log('');
        }

        // 4. 检查必需的表
        console.log('4️⃣ 检查必需的表...');
        const requiredTables = ['users', 'authenticators', 'cases', 'monitored_addresses'];
        const existingTables = tables.map((row: any) => Object.values(row)[0]);
        
        let missingTables = false;
        for (const table of requiredTables) {
            if (existingTables.includes(table)) {
                console.log(`✅ ${table} - 存在`);
            } else {
                console.log(`❌ ${table} - 缺失`);
                missingTables = true;
            }
        }

        if (missingTables) {
            console.log('\n⚠️ 有表缺失，请运行迁移:');
            console.log('   npm run db:push');
        }

        // 5. 检查 users 表结构
        if (existingTables.includes('users')) {
            console.log('\n5️⃣ 检查 users 表结构...');
            const columnsResult = await db.execute(sql`DESCRIBE users`);
            const columns = (columnsResult as any)[0];
            console.log('✅ users 表字段:');
            columns.forEach((col: any) => {
                console.log(`   - ${col.Field} (${col.Type})`);
            });
        }

        console.log('\n✅ 数据库检查完成！');
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ 检查失败:');
        console.error('错误信息:', error.message);
        
        if (error.message.includes('Unknown database')) {
            console.error('\n💡 数据库不存在，请创建数据库:');
            console.error('   mysql -u root -p');
            console.error('   CREATE DATABASE walletwatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        } else if (error.message.includes('Access denied')) {
            console.error('\n💡 数据库连接失败，请检查 .env 文件中的 DATABASE_URL');
        } else if (error.message.includes('Table') && error.message.includes("doesn't exist")) {
            console.error('\n💡 表不存在，请运行迁移:');
            console.error('   npm run db:push');
        }
        
        process.exit(1);
    }
}

checkDatabase();

