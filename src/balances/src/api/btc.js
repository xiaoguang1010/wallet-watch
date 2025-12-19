/**
 * Bitcoin API客户端
 */

const { sendJsonRpcRequest, API_BASE_URL } = require('./httpClient');

const WALLET_API_URL = `${API_BASE_URL}/v4/jsonrpc`;
const BTC_CAIP2 = 'bip122:000000000019d6689c085ae165831e93';

/**
 * 获取Bitcoin地址的代币列表（包括余额）
 */
async function getTokenListByAddress(address, riskLevel = 2) {
  const params = [{
    accountAddress: address,
    addressType: null,
    caip2: BTC_CAIP2,
    riskLevel: riskLevel,
    tokenStandard: ['NATIVE', 'OMNI'],
    position: ['Account'],
  }];

  return await sendJsonRpcRequest(WALLET_API_URL, 'wallet.getTokenListByAddress', params);
}

module.exports = {
  getTokenListByAddress,
  BTC_CAIP2,
};

