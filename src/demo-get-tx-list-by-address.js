/**
 * 演示Demo：获取ETH地址的交易记录列表
 * 
 * 提取自: src/api/endpoint/txs/api.ts - getTxListByAddress
 * 
 * 使用方法：
 * node demo-get-tx-list-by-address.js <ETH_ADDRESS> [chainId]
 * 
 * 示例：
 * node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901 1
 */

const https = require('https');

// API配置
const BIZ_API_BASE_URL = 'https://biz.token.im';
const ETHEREUM_API_URL = `${BIZ_API_BASE_URL}/v1/ethereum`;

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
 * 获取ETH地址的交易列表
 * 
 * 提取自: src/api/endpoint/txs/api.ts - getTxListByAddress
 * 
 * @param {string} address - ETH地址
 * @param {string|number} chainId - 链ID (默认: 1, 主网)
 * @param {string} contractAddress - 合约地址（可选，用于查询特定代币的交易）
 * @param {object} options - 其他选项
 * @returns {Promise<Array>} 交易列表
 */
async function getTxListByAddress(address, chainId = '1', contractAddress = null, options = {}) {
  // 构建请求参数（参考 src/api/endpoint/txs/api.ts 第82-87行）
  const params = {
    address: address,
    chainId: String(chainId),
    ...options,
  };

  // 如果有合约地址，添加到参数中
  if (contractAddress) {
    params.contractAddress = contractAddress;
  }

  // 调用API（参考 src/api/endpoint/txs/api.ts 第105-107行）
  const data = await sendJsonRpcGet(
    ETHEREUM_API_URL,
    'wallet.getTxListByAddress',
    [params]
  );

  // 处理返回数据（参考 src/api/endpoint/txs/api.ts 第108-112行）
  return (data || []).map((tx) => ({
    ...tx,
    chainId: chainId,
    contractAddress: contractAddress,
  }));
}

/**
 * 格式化交易信息
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

  // 解析ext中的gas信息
  let gasInfo = {};
  if (tx.ext) {
    try {
      gasInfo = JSON.parse(tx.ext);
    } catch (e) {
      // 忽略解析错误
    }
  }

  return {
    txHash: tx.txHash || tx.hash || tx.id,
    from: from,
    to: to,
    value: tx.amount || tx.value || '0',
    decimal: tx.decimal || 18,
    fee: tx.fee || '0',
    blockNumber: tx.blockNumber || tx.block || tx.blockHeight,
    blockTimestamp: tx.timestamp || tx.blockTimestamp || tx.time,
    status: tx.status === 'SUCCESS' || tx.status === 1 || tx.txStatus === 1 ? 1 : 0,
    statusText: tx.status || (tx.txStatus === 1 ? 'SUCCESS' : 'FAILED'),
    direction: tx.direction || 'UNKNOWN',
    gasUsed: gasInfo.gasUsed || tx.gasUsed || tx.gas,
    gasLimit: gasInfo.gasLimit || tx.gasLimit,
    gasPrice: gasInfo.gasPrice || tx.gasPrice,
    maxFeePerGas: gasInfo.maxFeePerGas,
    maxPriorityFeePerGas: gasInfo.maxPriorityFeePerGas,
    total: gasInfo.total || tx.total,
    nonce: tx.nonce,
    functionName: tx.functionName || tx.method || '',
    functionSignature: tx.functionSignature || tx.methodSignature || '',
    symbol: tx.symbol || 'ETH',
    name: tx.name || 'Ether',
    tokenType: tx.tokenType || 'NATIVE',
    contractAddress: tx.contractAddress,
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
 * 格式化金额（从wei转换为ETH）
 */
function formatValue(value, decimals = 18) {
  if (!value || value === '0') return '0';
  const valueBN = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const eth = Number(valueBN) / Number(divisor);
  return eth.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const address = args.find(arg => arg.startsWith('0x') && arg.length === 42);
  const chainId = args.find(arg => /^\d+$/.test(arg)) || '1';
  const contractAddress = args.find(arg => arg.startsWith('0x') && arg.length === 42 && arg !== address) || null;
  const showJson = args.includes('--json');

  if (!address) {
    console.error('错误: 请提供ETH地址');
    console.log('\n使用方法:');
    console.log('  node demo-get-tx-list-by-address.js <ETH_ADDRESS> [chainId] [contractAddress]');
    console.log('\n示例:');
    console.log('  node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901');
    console.log('  node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901 1');
    console.log('  node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901 1 0xdac17f958d2ee523a2206206994597c13d831ec7');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('ETH地址交易记录查询');
  console.log('='.repeat(80));
  console.log(`地址: ${address}`);
  console.log(`链ID: ${chainId}`);
  if (contractAddress) {
    console.log(`合约地址: ${contractAddress}`);
  }
  console.log(`API地址: ${ETHEREUM_API_URL}`);
  console.log('\n正在查询交易记录...\n');

  try {
    const txList = await getTxListByAddress(address, chainId, contractAddress);

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
      console.log(`   手续费: ${formatValue(formatted.fee, 18)} ETH`);
      console.log(`   区块号: ${formatted.blockNumber || 'N/A'}`);
      console.log(`   时间: ${formatTimestamp(formatted.blockTimestamp)}`);
      console.log(`   状态: ${formatted.statusText || (formatted.status === 1 ? '成功' : '失败')}`);
      console.log(`   方向: ${directionText}`);
      if (formatted.contractAddress) {
        console.log(`   合约地址: ${formatted.contractAddress}`);
      }
      if (formatted.gasUsed) {
        console.log(`   Gas使用: ${formatted.gasUsed}`);
      }
      if (formatted.gasLimit) {
        console.log(`   Gas限制: ${formatted.gasLimit}`);
      }
      if (formatted.gasPrice) {
        console.log(`   Gas价格: ${formatValue(formatted.gasPrice, 9)} Gwei`);
      }
      if (formatted.maxFeePerGas) {
        console.log(`   最大费用: ${formatValue(formatted.maxFeePerGas, 9)} Gwei`);
      }
      if (formatted.maxPriorityFeePerGas) {
        console.log(`   优先费用: ${formatValue(formatted.maxPriorityFeePerGas, 9)} Gwei`);
      }
      if (formatted.total) {
        console.log(`   总费用: ${formatValue(formatted.total, 18)} ETH`);
      }
      if (formatted.nonce !== undefined && formatted.nonce !== null) {
        console.log(`   Nonce: ${formatted.nonce}`);
      }
      if (formatted.functionName) {
        console.log(`   函数: ${formatted.functionName}`);
      }
      if (formatted.functionSignature) {
        console.log(`   函数签名: ${formatted.functionSignature}`);
      }
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

