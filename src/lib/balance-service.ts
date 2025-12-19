/**
 * 余额服务 - 使用 src/balances 中的模块获取余额
 * 这个文件在服务端运行，可以直接使用 CommonJS require
 */

import path from 'path';
import { createRequire } from 'module';

// 在 Next.js 中，使用 createRequire 和 process.cwd() 来加载 CommonJS 模块
const require = createRequire(process.cwd() + '/package.json');

const WALLET_ADDRESSES = {
  btc: 'bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc',
  eth: '0x16ac14eF9d1834c31828f4958aa4a6693846C901',
  tron: 'TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v',
};

// 懒加载 portfolio 服务模块
let portfolioService: any = null;
let portfolioModule: any = null;

function getPortfolioService() {
  if (!portfolioModule) {
    // 使用 process.cwd() 获取项目根目录，然后构建路径
    const portfolioPath = path.join(process.cwd(), 'src', 'balances', 'src', 'services', 'portfolio.js');
    console.log('[balance-service] Loading portfolio module from:', portfolioPath);
    portfolioModule = require(portfolioPath);
  }
  return portfolioModule;
}

export async function getGroup1Balances() {
  try {
    const portfolio = getPortfolioService();
    const getMultiChainPortfolio = portfolio.getMultiChainPortfolio;

    // 调用服务获取余额
    const result = await getMultiChainPortfolio({
      btc: WALLET_ADDRESSES.btc,
      eth: WALLET_ADDRESSES.eth,
      tron: WALLET_ADDRESSES.tron,
    });

    // 格式化返回数据
    return {
      success: true,
      data: {
        totalValue: result.totalValue || 0,
        totalValueFormatted: result.totalValueFormatted || '0.00',
        chains: {
          btc: result.chains.btc ? {
            chain: 'BTC',
            address: WALLET_ADDRESSES.btc,
            tokens: result.chains.btc.tokens && result.chains.btc.tokens.length > 0 
              ? result.chains.btc.tokens 
              : (result.chains.btc.allTokens || []).filter((t: any) => parseFloat(t.balance || '0') > 0),
            allTokens: result.chains.btc.allTokens || [],
            totalValue: result.chains.btc.totalValue || 0,
            mainToken: result.chains.btc.tokens?.find((t: any) => t.symbol === 'BTC') || 
                      result.chains.btc.allTokens?.find((t: any) => t.symbol === 'BTC') || null,
          } : null,
          eth: result.chains.eth ? {
            chain: 'ETH',
            address: WALLET_ADDRESSES.eth,
            tokens: result.chains.eth.tokens || [],
            allTokens: result.chains.eth.allTokens || [],
            totalValue: result.chains.eth.totalValue || 0,
            mainToken: result.chains.eth.tokens?.find((t: any) => t.symbol === 'ETH') || 
                      result.chains.eth.allTokens?.find((t: any) => t.symbol === 'ETH') || null,
          } : null,
          tron: result.chains.tron ? {
            chain: 'TRON',
            address: WALLET_ADDRESSES.tron,
            tokens: result.chains.tron.tokens || [],
            allTokens: result.chains.tron.allTokens || [],
            totalValue: result.chains.tron.totalValue || 0,
            mainToken: result.chains.tron.tokens?.find((t: any) => t.symbol === 'TRX') || 
                      result.chains.tron.allTokens?.find((t: any) => t.symbol === 'TRX') || null,
          } : null,
        },
      },
    };
  } catch (error: any) {
    console.error('Error fetching group1 balances:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch balances',
    };
  }
}

/**
 * 查询单个链的余额
 * @param address 钱包地址
 * @param chainType 链类型: 'BTC' | 'ETH' | 'TRON'
 */
export async function getSingleChainBalance(address: string, chainType: 'BTC' | 'ETH' | 'TRON') {
  try {
    const portfolio = getPortfolioService();
    const getSingleChainPortfolio = portfolio.getSingleChainPortfolio;

    const result = await getSingleChainPortfolio(address, chainType);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error(`Error fetching ${chainType} balance:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch ${chainType} balance`,
    };
  }
}

/**
 * 查询多链资产组合
 * @param addresses 地址对象 { btc?: string, eth?: string, tron?: string }
 */
export async function getMultiChainPortfolio(addresses: {
  btc?: string;
  eth?: string;
  tron?: string;
}) {
  try {
    if (!addresses.btc && !addresses.eth && !addresses.tron) {
      return {
        success: false,
        error: '至少需要提供一个地址参数 (btc, eth, tron)',
      };
    }

    const portfolio = getPortfolioService();
    const getMultiChainPortfolio = portfolio.getMultiChainPortfolio;

    const result = await getMultiChainPortfolio(addresses);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('Error fetching multi-chain portfolio:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch multi-chain portfolio',
    };
  }
}

/**
 * 批量查询多个地址
 * @param addresses 地址数组 [{ chain: 'btc' | 'eth' | 'tron', address: string }, ...]
 */
export async function getBatchPortfolio(addresses: Array<{ chain: string; address: string }>) {
  try {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return {
        success: false,
        error: 'addresses must be a non-empty array',
      };
    }

    const addressMap: { btc?: string; eth?: string; tron?: string } = {};
    addresses.forEach(item => {
      const chain = (item.chain || '').toLowerCase();
      if (['btc', 'eth', 'tron'].includes(chain)) {
        addressMap[chain as 'btc' | 'eth' | 'tron'] = item.address;
      }
    });

    return await getMultiChainPortfolio(addressMap);
  } catch (error: any) {
    console.error('Error fetching batch portfolio:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch batch portfolio',
    };
  }
}

