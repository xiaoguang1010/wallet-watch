/**
 * HTTP客户端 - 统一的JSON-RPC请求封装
 */

const https = require('https');

// API配置
const API_BASE_URL = 'https://api.token.im';
const BIZ_API_BASE_URL = 'https://biz.token.im';

// 默认请求头
const DEFAULT_HEADERS = {
  'Host': 'api.token.im',
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
 * 发送JSON-RPC请求
 */
function sendJsonRpcRequest(url, method, params, customHeaders = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const headers = {
      ...DEFAULT_HEADERS,
      'x-b3-traceid': generateTraceId(),
      'x-b3-spanid': generateSpanId(),
      ...customHeaders,
    };

    // 如果是biz.token.im，需要修改Host header
    if (url.includes('biz.token.im')) {
      headers['Host'] = 'biz.token.im';
    }

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

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(requestBody);
    req.end();
  });
}

module.exports = {
  sendJsonRpcRequest,
  API_BASE_URL,
  BIZ_API_BASE_URL,
};


