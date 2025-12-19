/**
 * 价格API客户端
 */

const https = require('https');
const { sendJsonRpcRequest, BIZ_API_BASE_URL } = require('./httpClient');

const MARKET_API_URL = `${BIZ_API_BASE_URL}/v1/market`;

/**
 * 获取代币价格（使用项目API）
 */
async function getPrices(priceParams) {
  try {
    return await sendJsonRpcRequest(MARKET_API_URL, 'market.getPrices', priceParams);
  } catch (error) {
    console.log(`  ⚠️  价格API失败: ${error.message}`);
    return await getPricesFromCoinGecko(priceParams);
  }
}

/**
 * 从CoinGecko获取价格（备用）
 */
async function getPricesFromCoinGecko(priceParams) {
  const tokenMap = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'TRX': 'tron',
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'DAI': 'dai',
    'BUSD': 'binance-usd',
    'CRVUSD': 'crvusd',
    'WETH': 'weth',
  };

  const symbols = priceParams.map(param => {
    const address = (param.address || '').toLowerCase();
    const chainType = param.chainType || '';
    
    // 原生币识别
    if (!address || address === '0x0000000000000000000000000000000000000000' || address === '' || address === '_') {
      if (chainType === 'BITCOIN') return 'BTC';
      if (chainType === 'ETHEREUM') return 'ETH';
      if (chainType === 'TRON') return 'TRX';
    }
    
    // 常见代币地址映射
    if (address === '0xdac17f958d2ee523a2206206994597c13d831ec7') return 'USDT';
    if (address === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') return 'USDC';
    if (address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') return 'WETH';
    if (address === '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e') return 'CRVUSD';
    if (address === 'tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t') return 'USDT';
    
    return null;
  }).filter(Boolean);

  const uniqueSymbols = [...new Set(symbols)];
  const ids = uniqueSymbols.map(s => tokenMap[s.toUpperCase()]).filter(Boolean).join(',');
  
  if (!ids) {
    return priceParams.map(() => ({ price: 0 }));
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const response = await new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });

    return priceParams.map(param => {
      const address = (param.address || '').toLowerCase();
      const chainType = param.chainType || '';
      let symbol = null;
      
      if (!address || address === '0x0000000000000000000000000000000000000000' || address === '' || address === '_') {
        if (chainType === 'BITCOIN') symbol = 'BTC';
        if (chainType === 'ETHEREUM') symbol = 'ETH';
        if (chainType === 'TRON') symbol = 'TRX';
      } else if (address === '0xdac17f958d2ee523a2206206994597c13d831ec7') {
        symbol = 'USDT';
      } else if (address === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') {
        symbol = 'USDC';
      } else if (address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        symbol = 'WETH';
      } else if (address === '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e') {
        symbol = 'CRVUSD';
      } else if (address === 'tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t') {
        symbol = 'USDT';
      }
      
      if (symbol && tokenMap[symbol]) {
        const id = tokenMap[symbol];
        const price = response[id]?.usd || 0;
        return { price };
      }
      return { price: 0 };
    });
  } catch (error) {
    console.log(`  ⚠️  CoinGecko API失败: ${error.message}`);
    // 使用默认价格
    const defaultPrices = {
      'BTC': 95000,
      'ETH': 3500,
      'TRX': 0.12,
      'USDT': 1,
      'USDC': 1,
      'WETH': 3500,
      'CRVUSD': 1,
    };
    
    return priceParams.map(param => {
      const address = (param.address || '').toLowerCase();
      const chainType = param.chainType || '';
      let price = 0;
      
      if (!address || address === '0x0000000000000000000000000000000000000000' || address === '' || address === '_') {
        if (chainType === 'BITCOIN') price = defaultPrices.BTC;
        if (chainType === 'ETHEREUM') price = defaultPrices.ETH;
        if (chainType === 'TRON') price = defaultPrices.TRX;
      } else if (address === '0xdac17f958d2ee523a2206206994597c13d831ec7' || address === 'tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t') {
        price = defaultPrices.USDT;
      } else if (address === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') {
        price = defaultPrices.USDC;
      } else if (address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        price = defaultPrices.WETH;
      } else if (address === '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e') {
        price = defaultPrices.CRVUSD;
      }
      
      return { price };
    });
  }
}

module.exports = {
  getPrices,
};

