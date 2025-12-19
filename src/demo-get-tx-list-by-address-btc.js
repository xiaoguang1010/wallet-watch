/**
 * 演示Demo：获取BTC地址的交易记录列表
 * 
 * 基于ETH交易查询的逻辑，适配BTC地址
 * 
 * 使用方法：
 * node demo-get-tx-list-by-address-btc.js <BTC_ADDRESS> [chainId]
 * 
 * 示例：
 * node demo-get-tx-list-by-address-btc.js 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa 0
 */

const https = require('https');

// API配置 - 使用与ETH相同的base URL，但使用bitcoin endpoint
const BIZ_API_BASE_URL = 'https://biz.token.im';
const BITCOIN_API_URL = `${BIZ_API_BASE_URL}/v1/bitcoin`;

// 默认请求头
const DEFAULT_HEADERS = {
  'Host': 'biz.token.im',
  'accept': 'application/json, text/plain, */*',
  'x-identifier': 'im14x59ZAQKkGoQCKpXWQyNg49MzN7FYJnPWuyB',
  'x-client-version': 'android:2.17.3.8655:94',
  'x-device-token': 'd53c2aa2ef6d6cf8',
  'x-locale': 'zh-CN',
  'x-currency': 'USD',
  'x-device-locale': 'zh-CN',
  'x-app-id': 'im.token.app',
  'content-type': 'application/json',
  'user-agent': 'okhttp/4.12.0',
};

/**
 * 生成随机Trace ID
 */
function generateTraceId() {
  return Math.random().toString(16).substring(2, 18) + 
         Math.random().toString(16).substring(2, 18);
}

/**
 * 生成随机Span ID
 */
function generateSpanId() {
  return '0' + Math.random().toString(16).substring(2, 15);
}

/**
 * 发送JSON-RPC GET请求（模拟jsonrpc.get）
 */
function sendJsonRpcGet(url, method, params, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const headers = {
      ...DEFAULT_HEADERS,
      'x-b3-traceid': generateTraceId(),
      'x-b3-spanid': generateSpanId(),
    };

    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: method,
      params: params,
    });

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            reject(new Error(`JSON-RPC Error: ${JSON.stringify(response.error)}`));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(new Error(`Parse response error: ${error.message}\nResponse: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * 替换BCH地址前缀（如果需要）
 */
function replaceAddrPrefix(address) {
  // 移除bitcoincash:前缀
  return address.replace('bitcoincash:', '');
}

/**
 * 获取BTC地址的交易列表
 * 
 * 基于用户提供的demo逻辑
 * 
 * @param {string} address - BTC地址
 * @param {string|number} chainId - 链ID (BTC主网: 0, 测试网: 1)
 * @param {object} options - 其他选项
 * @returns {Promise<Array>} 交易列表
 */
async function getTxListByAddress(address, chainId = '0', options = {}) {
  // 构建请求参数 - BTC不需要contractAddress
  // 根据用户demo，BTC-like chains需要排除contractAddress和propertyId
  const params = {
    address: replaceAddrPrefix(address),
    addresses: [replaceAddrPrefix(address)],
    chainId: String(chainId),
    ...options,
  };

  // 移除不适用于BTC的字段
  delete params.contractAddress;
  delete params.propertyId;

  // 调用BTC API
  const data = await sendJsonRpcGet(
    BITCOIN_API_URL,
    'wallet.getTxListByAddress',
    [params]
  );

  // 处理返回数据
  return (data || []).map((tx) => ({
    ...tx,
    chainId: chainId,
  }));
}

/**
 * 格式化BTC交易信息
 */
function formatTx(tx, queryAddress) {
  // 根据direction判断from和to
  let from, to;
  if (tx.direction === 'SEND') {
    from = tx.address || queryAddress;
    to = tx.counterparty || 'N/A';
  } else if (tx.direction === 'RECEIVE') {
    from = tx.counterparty || 'N/A';
    to = tx.address || queryAddress;
  } else {
    // 兼容旧格式
    from = tx.txFrom || tx.from || tx.fromAddress || tx.address || 'N/A';
    to = tx.txTo || tx.to || tx.toAddress || tx.counterparty || 'N/A';
  }

  // 解析ext中的费用信息
  let feeInfo = {};
  if (tx.ext) {
    try {
      feeInfo = JSON.parse(tx.ext);
    } catch (e) {
      // 忽略解析错误
    }
  }

  return {
    txHash: tx.txHash || tx.hash || tx.id,
    from: from,
    to: to,
    value: tx.amount || tx.value || '0',
    decimal: tx.decimal || 8, // BTC uses 8 decimals
    fee: tx.fee || '0',
    blockNumber: tx.blockNumber || tx.block || tx.blockHeight,
    blockTimestamp: tx.timestamp || tx.blockTimestamp || tx.time,
    status: tx.status === 'SUCCESS' || tx.status === 1 || tx.txStatus === 1 ? 1 : 0,
    statusText: tx.status || (tx.txStatus === 1 ? 'SUCCESS' : 'FAILED'),
    direction: tx.direction || 'UNKNOWN',
    confirmations: tx.confirmations || 0,
    symbol: tx.symbol || 'BTC',
    name: tx.name || 'Bitcoin',
    tokenType: 'NATIVE',
    memo: tx.memo || '',
    // 保留原始数据
    raw: tx,
  };
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN');
}

/**
 * 格式化BTC金额（从satoshi转换为BTC）
 */
function formatValue(value, decimals = 8) {
  if (!value || value === '0') return '0';
  const valueBN = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const btc = Number(valueBN) / Number(divisor);
  return btc.toFixed(8).replace(/\.?0+$/, '');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const address = args[0];
  const chainId = args[1] || '0'; // BTC主网默认为0
  const showJson = args.includes('--json');

  if (!address) {
    console.error('错误: 请提供BTC地址');
    console.log('\n使用方法:');
    console.log('  node demo-get-tx-list-by-address-btc.js <BTC_ADDRESS> [chainId]');
    console.log('\n示例:');
    console.log('  node demo-get-tx-list-by-address-btc.js 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    console.log('  node demo-get-tx-list-by-address-btc.js bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc 0');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('BTC地址交易记录查询');
  console.log('='.repeat(80));
  console.log(`地址: ${address}`);
  console.log(`链ID: ${chainId} (0=主网, 1=测试网)`);
  console.log(`API地址: ${BITCOIN_API_URL}`);
  console.log('\n正在查询交易记录...\n');

  try {
    const txList = await getTxListByAddress(address, chainId);

    if (!txList || txList.length === 0) {
      console.log('未找到任何交易记录');
      return;
    }

    console.log(`找到 ${txList.length} 条交易记录\n`);

    // 按时间戳排序（最新的在前）
    txList.sort((a, b) => {
      const tsA = a.timestamp || a.blockTimestamp || 0;
      const tsB = b.timestamp || b.blockTimestamp || 0;
      return tsB - tsA;
    });

    // 显示交易列表
    console.log('='.repeat(80));
    console.log('交易记录列表（按时间倒序）');
    console.log('='.repeat(80));

    txList.slice(0, 20).forEach((tx, index) => {
      const formatted = formatTx(tx, address);
      const directionText = formatted.direction === 'SEND' ? '发送' : formatted.direction === 'RECEIVE' ? '接收' : '未知';
      
      console.log(`\n${index + 1}. 交易 #${index + 1}`);
      console.log(`   交易哈希: ${formatted.txHash}`);
      console.log(`   发送地址(From): ${formatted.from}`);
      console.log(`   接收地址(To):   ${formatted.to}`);
      console.log(`   交易金额: ${formatValue(formatted.value, formatted.decimal)} ${formatted.symbol}`);
      console.log(`   手续费: ${formatValue(formatted.fee, 8)} BTC`);
      console.log(`   区块号: ${formatted.blockNumber || 'N/A'}`);
      console.log(`   确认数: ${formatted.confirmations || 'N/A'}`);
      console.log(`   时间: ${formatTimestamp(formatted.blockTimestamp)}`);
      console.log(`   状态: ${formatted.statusText || (formatted.status === 1 ? '成功' : '失败')}`);
      console.log(`   方向: ${directionText}`);
      if (formatted.memo) {
        console.log(`   备注: ${formatted.memo}`);
      }
    });

    // 统计信息
    console.log('\n' + '='.repeat(80));
    console.log('统计信息');
    console.log('='.repeat(80));
    console.log(`总交易数: ${txList.length}`);
    const successCount = txList.filter(tx => {
      const status = tx.status === 'SUCCESS' || tx.status === 1 || tx.txStatus === 1;
      return status;
    }).length;
    console.log(`成功交易: ${successCount}`);
    console.log(`失败交易: ${txList.length - successCount}`);

    if (txList.length > 0) {
      const firstTx = txList[0];
      const lastTx = txList[txList.length - 1];
      console.log(`最早交易: ${formatTimestamp(lastTx.timestamp || lastTx.blockTimestamp)}`);
      console.log(`最新交易: ${formatTimestamp(firstTx.timestamp || firstTx.blockTimestamp)}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('查询完成！');
    console.log('='.repeat(80));

    // 输出原始JSON（可选）
    if (showJson) {
      console.log('\n原始JSON数据:');
      console.log(JSON.stringify(txList, null, 2));
    }

  } catch (error) {
    console.error('查询失败:', error.message);
    if (error.stack) {
      console.error('\n错误堆栈:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

// 导出函数
module.exports = {
  getTxListByAddress,
  sendJsonRpcGet,
  formatTx,
};

