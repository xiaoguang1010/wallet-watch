/**
 * 资产组合服务 - 处理多链资产汇总
 */

// 在某些打包/运行环境中，require('bignumber.js') 可能返回 { default: BigNumber } 或 { BigNumber: BigNumber }
const BigNumberImport = require('bignumber.js');
const BigNumber =
  (BigNumberImport && (BigNumberImport.default || BigNumberImport.BigNumber)) ||
  BigNumberImport;
const { getChainBalance } = require('./balance');
const btcAPI = require('../api/btc');
const ethAPI = require('../api/eth');
const tronAPI = require('../api/tron');

/**
 * 计算总价值
 */
function calcTotal(assetTokens) {
  let totalValue = new BigNumber(0);

  assetTokens.forEach((asset) => {
    const { balance, decimals, price } = asset;
    if (!balance || balance === '0' || !price) return;

    const amount = new BigNumber(balance).div(new BigNumber(10).pow(decimals));
    const value = amount.multipliedBy(price);
    totalValue = totalValue.plus(value);
  });

  return totalValue.toNumber();
}

/**
 * 查询多链资产组合
 */
async function getMultiChainPortfolio(addresses) {
  const { btc, eth, tron } = addresses;

  const results = await Promise.allSettled([
    btc ? getChainBalance(btc, 'BITCOIN', btcAPI.BTC_CAIP2, btcAPI.getTokenListByAddress) : Promise.resolve(null),
    eth ? getChainBalance(eth, 'ETHEREUM', ethAPI.ETH_CAIP2, ethAPI.getTokenListByAddress) : Promise.resolve(null),
    tron ? getChainBalance(tron, 'TRON', tronAPI.TRON_CAIP2, tronAPI.getTokenListByAddress) : Promise.resolve(null),
  ]);

  const chains = {
    btc: results[0].status === 'fulfilled' ? results[0].value : null,
    eth: results[1].status === 'fulfilled' ? results[1].value : null,
    tron: results[2].status === 'fulfilled' ? results[2].value : null,
  };

  // 计算总价值
  const totalValue = Object.values(chains)
    .filter(chain => chain && !chain.error)
    .reduce((sum, chain) => sum + (chain.totalValue || 0), 0);

  return {
    chains,
    totalValue,
    totalValueFormatted: totalValue.toFixed(2),
  };
}

/**
 * 查询单个链的资产
 */
async function getSingleChainPortfolio(address, chainType) {
  let getTokenListFn, caip2, chainName;

  switch (chainType.toUpperCase()) {
    case 'BTC':
    case 'BITCOIN':
      getTokenListFn = btcAPI.getTokenListByAddress;
      caip2 = btcAPI.BTC_CAIP2;
      chainName = 'BITCOIN';
      break;
    case 'ETH':
    case 'ETHEREUM':
      getTokenListFn = ethAPI.getTokenListByAddress;
      caip2 = ethAPI.ETH_CAIP2;
      chainName = 'ETHEREUM';
      break;
    case 'TRON':
    case 'TRX':
      getTokenListFn = tronAPI.getTokenListByAddress;
      caip2 = tronAPI.TRON_CAIP2;
      chainName = 'TRON';
      break;
    default:
      throw new Error(`Unsupported chain type: ${chainType}`);
  }

  return await getChainBalance(address, chainName, caip2, getTokenListFn);
}

module.exports = {
  calcTotal,
  getMultiChainPortfolio,
  getSingleChainPortfolio,
};


