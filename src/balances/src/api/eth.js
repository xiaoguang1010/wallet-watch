/**
 * Ethereum API客户端
 */

const { sendJsonRpcRequest, API_BASE_URL } = require('./httpClient');

const WALLET_API_URL = `${API_BASE_URL}/v4/jsonrpc`;
const ETH_CAIP2 = 'eip155:1';

/**
 * 获取Ethereum地址的代币列表（包括余额）
 */
async function getTokenListByAddress(address, riskLevel = 2) {
  const params = [{
    accountAddress: address,
    addressType: null,
    caip2: ETH_CAIP2,
    riskLevel: riskLevel,
    tokenStandard: ['NATIVE', 'ERC20'],
    position: ['Account'],
  }];

  return await sendJsonRpcRequest(WALLET_API_URL, 'wallet.getTokenListByAddress', params);
}

module.exports = {
  getTokenListByAddress,
  ETH_CAIP2,
};

