import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:mbk3zqBRQ9DS@52.80.70.16:3306/walletwatch";

async function listTables() {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    try {
        console.log('📊 检查数据库表...\n');
        
        const [tables] = await connection.query('SHOW TABLES');
        
        if ((tables as any[]).length === 0) {
            console.log('⚠️  数据库中没有表！');
        } else {
            console.log(`✅ 找到 ${(tables as any[]).length} 个表:`);
            for (const row of tables as any[]) {
                const tableName = Object.values(row)[0];
                console.log(`   - ${tableName}`);
                
                // 显示每个表的列
                const [columns] = await connection.query(`DESCRIBE ${tableName}`);
                console.log(`      字段: ${(columns as any[]).map(c => c.Field).join(', ')}`);
            }
        }
        
    } finally {
        await connection.end();
    }
}

listTables();

