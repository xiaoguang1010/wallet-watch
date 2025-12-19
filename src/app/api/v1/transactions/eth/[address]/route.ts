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
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch ETH transactions',
      },
      { status: 500 }
    );
  }
}

