/**
 * 余额服务 - 处理余额查询和格式化
 */

// 在 Vercel/Next.js 环境中，需要从项目根目录加载 bignumber.js
let BigNumber;
try {
  // 首先尝试正常的 require
  BigNumber = require('bignumber.js');
} catch (e) {
  // 如果失败，尝试从项目根目录的 node_modules 加载
  const path = require('path');
  const bignumberPath = path.join(process.cwd(), 'node_modules', 'bignumber.js');
  BigNumber = require(bignumberPath);
}

const { getPrices } = require('../api/prices');

/**
 * 格式化余额
 */
function formatBalance(balance, decimals) {
  if (!balance || balance === '0') {
    return '0';
  }
  const balanceBN = new BigNumber(balance);
  const divisor = new BigNumber(10).pow(decimals);
  const result = balanceBN.div(divisor);
  const formatted = result.toFixed(decimals);
  return formatted.replace(/\.?0+$/, '');
}

/**
 * 从原始单位转换为可读单位
 */
function fromDecimalToUnit(balance, decimal) {
  const balanceBN = new BigNumber(balance);
  const divisor = new BigNumber(10).pow(decimal);
  return balanceBN.div(divisor);
}

/**
 * 格式化数值
 */
function formatWithMiniValue(value, miniValue = '0.01', decimals = 2) {
  const valueBN = new BigNumber(value);
  const miniBN = new BigNumber(miniValue);
  
  if (valueBN.lt(miniBN)) {
    return '< ' + miniValue;
  }
  
  return valueBN.toFixed(decimals);
}

/**
 * 计算代币的USD价值
 */
function calculateTokenUSDValue(balance, price, decimal) {
  if (!balance || balance === '0' || !price) {
    return null;
  }
  
  const amount = fromDecimalToUnit(balance, decimal);
  const value = amount.multipliedBy(price);
  return formatWithMiniValue(value.toString(), '0.01', 2);
}

/**
 * 查询单个链的余额（带价格）
 */
async function getChainBalance(address, chainName, caip2, getTokenListFn) {
  try {
    // 1. 获取代币列表
    const tokens = await getTokenListFn(address);
    
    if (!tokens || tokens.length === 0) {
      return {
        chain: chainName,
        tokens: [],
        totalValue: 0,
      };
    }

    // 2. 准备价格查询参数
    const priceParams = tokens.map(token => ({
      caip2: token.caip2 || caip2,
      address: token.tokenAddress || token.address || '',
      chainType: chainName,
    }));

    // 3. 获取价格
    let prices = [];
    try {
      prices = await getPrices(priceParams);
    } catch (error) {
      console.log(`  ⚠️  获取价格失败: ${error.message}`);
      prices = priceParams.map(() => ({}));
    }

    // 4. 合并代币和价格信息
    const tokensWithPrice = tokens.map((token, index) => {
      const priceData = prices[index] || {};
      const balance = token.balance || '0';
      const decimals = token.decimals || token.decimal || (chainName === 'TRON' ? 6 : chainName === 'BITCOIN' ? 8 : 18);
      const price = priceData.price || 0;
      const formattedBalance = formatBalance(balance, decimals);
      const usdValue = calculateTokenUSDValue(balance, price, decimals);
      
      return {
        symbol: token.symbol || token.displaySymbol || 'UNKNOWN',
        name: token.name || token.displayName || 'Unknown Token',
        address: token.tokenAddress || token.address || 'N/A',
        balance: balance,
        formattedBalance: formattedBalance,
        decimals: decimals,
        price: price,
        usdValue: usdValue ? parseFloat(usdValue.replace(/[< ]/g, '')) : 0,
        usdValueFormatted: usdValue || '0.00',
        tokenStandard: token.tokenStandard || 'UNKNOWN',
      };
    });

    // 5. 过滤有余额的代币
    const tokensWithBalance = tokensWithPrice.filter(token => {
      const balanceBN = new BigNumber(token.balance || '0');
      return balanceBN.gt(0);
    });

    // 6. 按USD价值排序
    tokensWithBalance.sort((a, b) => b.usdValue - a.usdValue);

    // 7. 计算总价值
    const totalValue = tokensWithPrice.reduce((sum, token) => sum + token.usdValue, 0);

    return {
      chain: chainName,
      tokens: tokensWithBalance,
      allTokens: tokensWithPrice,
      totalValue: totalValue,
      totalValueFormatted: formatWithMiniValue(totalValue.toString(), '0.01', 2),
    };
  } catch (error) {
    console.error(`查询 ${chainName} 链失败:`, error.message);
    return {
      chain: chainName,
      tokens: [],
      allTokens: [],
      totalValue: 0,
      totalValueFormatted: '0.00',
      error: error.message,
    };
  }
}

module.exports = {
  formatBalance,
  fromDecimalToUnit,
  formatWithMiniValue,
  calculateTokenUSDValue,
  getChainBalance,
};

