import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import path from 'path';

// 使用 CommonJS require 加载 JS 模块
const require = createRequire(process.cwd() + '/package.json');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    const contractAddress = searchParams.get('contractAddress') || null;
    
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    // 加载 getTxListByAddress 函数
    const txModulePath = path.join(process.cwd(), 'src', 'demo-get-tx-list-by-address.js');
    const { getTxListByAddress, formatTx } = require(txModulePath);

    // 调用函数获取交易列表
    const txList = await getTxListByAddress(address, chainId, contractAddress);

    // 格式化交易数据
    const formattedTxList = (txList || []).map((tx: any) => formatTx(tx, address));

    // 按时间戳排序（最新的在前）
    formattedTxList.sort((a: any, b: any) => {
      return (b.blockTimestamp || 0) - (a.blockTimestamp || 0);
    });

    return NextResponse.json({
      success: true,
      data: {
        address,
        chainId,
        contractAddress,
        transactions: formattedTxList,
        total: formattedTxList.length,
      },
    });
  } catch (error: any) {
    console.error('Error in ETH transactions API route:', error);

    // Normalize upstream failures to friendlier messages & meaningful HTTP statuses.
    const rawMessage = String(error?.message || '');
    const isTimeout =
      rawMessage.includes('Upstream HTTP 504') ||
      rawMessage.includes('Request timeout') ||
      rawMessage.includes('ETIMEDOUT');
    const isBadGateway =
      rawMessage.includes('Upstream returned non-JSON response') ||
      rawMessage.includes('Parse response error') ||
      rawMessage.includes('Upstream HTTP 502');

    const status = isTimeout ? 504 : isBadGateway ? 502 : 500;
    const message = isTimeout
      ? '交易上游服务超时(504)，请稍后重试'
      : isBadGateway
        ? '交易上游服务响应异常，请稍后重试'
        : (error?.message || 'Failed to fetch ETH transactions');

    return NextResponse.json(
      {
        success: false,
        error: message,
        // Keep raw error for debugging if needed (front-end should not display this directly).
        details: rawMessage || undefined,
      },
      { status }
    );
  }
}

