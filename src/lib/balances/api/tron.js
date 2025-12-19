/**
 * TRON API客户端
 */

const { sendJsonRpcRequest, API_BASE_URL } = require('./httpClient');

const WALLET_API_URL = `${API_BASE_URL}/v4/jsonrpc`;
const TRON_CAIP2 = 'tip174:00000000000000001ebf88508a03865c';

/**
 * 获取TRON地址的代币列表（包括余额）
 */
async function getTokenListByAddress(address, riskLevel = 2) {
  const params = [{
    accountAddress: address,
    addressType: null,
    caip2: TRON_CAIP2,
    riskLevel: riskLevel,
    tokenStandard: ['NATIVE', 'TRC20', 'TRC10'],
    position: ['Account'],
  }];

  return await sendJsonRpcRequest(WALLET_API_URL, 'wallet.getTokenListByAddress', params);
}

module.exports = {
  getTokenListByAddress,
  TRON_CAIP2,
};


