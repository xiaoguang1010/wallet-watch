# BTC Transaction Display Implementation

## Overview
This document describes the implementation of Bitcoin (BTC) transaction list display functionality in the Wallet Watch application.

## Implementation Details

### 1. BTC Transaction Fetching Module
**File**: `src/demo-get-tx-list-by-address-btc.js`

This module handles fetching BTC transaction data from the backend API.

**Key Features**:
- Uses the same API base URL as ETH (`https://biz.token.im`)
- BTC-specific endpoint: `/v1/bitcoin`
- JSON-RPC method: `wallet.getTxListByAddress`
- Handles BTC address format (no `0x` prefix)
- Removes `contractAddress` and `propertyId` fields (not applicable to BTC)
- Uses 8 decimal places for BTC (vs 18 for ETH)

**Key Functions**:
- `getTxListByAddress(address, chainId, options)`: Fetches transaction list
- `formatTx(tx, queryAddress)`: Formats transaction data
- `replaceAddrPrefix(address)`: Handles Bitcoin Cash address prefix removal

### 2. BTC Transaction API Route
**File**: `src/app/api/v1/transactions/btc/[address]/route.ts`

Next.js API route that serves BTC transaction data to the frontend.

**Endpoint**: `GET /api/v1/transactions/btc/[address]`

**Query Parameters**:
- `chainId`: Chain ID (0 = mainnet, 1 = testnet)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "address": "bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc",
    "chainId": "0",
    "transactions": [...],
    "total": 50
  }
}
```

### 3. Transaction List Component Updates
**File**: `src/components/cases/transaction-list.tsx`

**Changes**:
1. **Dynamic API Endpoint Selection**:
   ```typescript
   const chainPath = chainType.toLowerCase(); // 'eth', 'btc', 'tron'
   const url = new URL(`/api/v1/transactions/${chainPath}/${encodeURIComponent(address)}`, window.location.origin);
   ```

2. **Chain-Specific Explorer URLs**:
   ```typescript
   const getExplorerUrl = (txHash: string): string => {
     switch (chainType) {
       case 'BTC':
         return `https://blockchair.com/bitcoin/transaction/${txHash}`;
       case 'ETH':
         return `https://etherscan.io/tx/${txHash}`;
       case 'TRON':
         return `https://tronscan.org/#/transaction/${txHash}`;
       default:
         return `https://etherscan.io/tx/${txHash}`;
     }
   };
   ```

3. **Chain-Specific Fee Display**:
   ```typescript
   {formatValue(tx.fee, chainType === 'BTC' ? 8 : 18)} {chainType === 'BTC' ? 'BTC' : chainType === 'TRON' ? 'TRX' : 'ETH'}
   ```

### 4. Case Dashboard Updates
**File**: `src/components/cases/case-dashboard-view.tsx`

**Changes**:
- Updated `supportsTransactions` check to include BTC:
  ```typescript
  const chainUpper = addr.chain?.toUpperCase();
  const supportsTransactions = chainUpper === 'ETH' || chainUpper === 'BTC';
  ```

- BTC tokens now display as clickable buttons with transaction history support
- Removed "即将支持" (coming soon) badge for BTC tokens

## Supported Chains

| Chain | Status | Explorer |
|-------|--------|----------|
| ETH   | ✅ Supported | Etherscan |
| BTC   | ✅ Supported | Blockchair |
| TRON  | 🔄 Prepared (API route needed) | Tronscan |

## Testing

### Command Line Test
```bash
node src/demo-get-tx-list-by-address-btc.js bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc 0
```

### API Test
```bash
curl "http://localhost:3000/api/v1/transactions/btc/bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc?chainId=0"
```

### Frontend Test
1. Add a BTC address to a case/folder
2. View the case dashboard
3. Click on a BTC token in the token list
4. Verify transaction history is displayed

## BTC vs ETH Differences

| Aspect | ETH | BTC |
|--------|-----|-----|
| Address Prefix | `0x` | Various (bc1, 1, 3, etc.) |
| Decimals | 18 | 8 |
| API Endpoint | `/v1/ethereum` | `/v1/bitcoin` |
| Contract Address | Supported | N/A |
| Token Standard | ERC-20, ERC-721 | Native only |
| Chain ID | 1 (mainnet) | 0 (mainnet) |
| Explorer | Etherscan | Blockchair |

## Transaction Data Format

### Common Fields
```typescript
interface Transaction {
  txHash: string;           // Transaction hash
  from: string;             // Sender address
  to: string;              // Recipient address
  value: string;           // Amount (in smallest unit)
  decimal: number;         // Decimal places (8 for BTC, 18 for ETH)
  fee: string;             // Transaction fee
  blockNumber: number;     // Block number
  blockTimestamp: number;  // Unix timestamp
  status: number;          // 1 = success, 0 = failed
  statusText: string;      // Status text
  direction: string;       // 'SEND' | 'RECEIVE' | 'UNKNOWN'
  symbol: string;          // Token symbol
  name: string;            // Token name
  tokenType: string;       // 'NATIVE' | 'ERC20' | etc.
}
```

### BTC-Specific Fields
```typescript
interface BTCTransaction extends Transaction {
  confirmations: number;   // Number of confirmations
  // No gasUsed, gasLimit, gasPrice (these are ETH-specific)
}
```

## Error Handling

The implementation includes proper error handling for:
- Network timeouts
- Invalid addresses
- API errors
- Missing data

Error messages are displayed to users via toast notifications.

## Future Enhancements

1. **TRON Support**: Add TRON transaction API route
2. **Pagination**: Implement transaction list pagination
3. **Filtering**: Add transaction filtering by date, amount, direction
4. **Export**: Allow users to export transaction history
5. **Real-time Updates**: WebSocket support for real-time transaction updates
6. **Transaction Details**: Modal with detailed transaction information
7. **Address Labels**: Allow users to label known addresses

## API Rate Limits

The current implementation uses the `biz.token.im` API which may have rate limits. Consider:
- Implementing request caching
- Adding retry logic with exponential backoff
- Monitoring API usage

## Security Considerations

1. **API Keys**: Currently using hardcoded API headers. Consider moving to environment variables in production.
2. **Input Validation**: All address inputs are validated before API calls.
3. **CORS**: API routes are server-side only, preventing CORS issues.
4. **XSS Prevention**: All user inputs are properly escaped.

## Performance Optimization

1. **Lazy Loading**: Transaction list is only fetched when user clicks on a token.
2. **Response Caching**: Consider implementing client-side caching for recently viewed transactions.
3. **Request Deduplication**: Prevent duplicate requests for the same data.

## Deployment Notes

1. Ensure the BTC transaction demo script is included in the deployment.
2. Verify API endpoint accessibility in production.
3. Monitor API response times and error rates.
4. Set up proper logging for transaction fetching operations.

## Related Files

- `src/demo-get-tx-list-by-address.js` - ETH transaction demo
- `src/app/api/v1/transactions/eth/[address]/route.ts` - ETH API route
- `src/app/api/v1/balance/btc/[address]/route.ts` - BTC balance API route
- `src/lib/balance-service.ts` - Balance fetching service

## Changelog

### 2025-12-19
- ✅ Implemented BTC transaction fetching module
- ✅ Created BTC transaction API route
- ✅ Updated transaction list component for multi-chain support
- ✅ Updated case dashboard to enable BTC transaction display
- ✅ Added chain-specific explorer URLs
- ✅ Tested with live BTC address

## Support

For issues or questions, please refer to:
- API Documentation: Check `src/demo-get-tx-list-README.md` for ETH reference
- Balance API: Check balance service implementation
- Frontend Components: Review transaction list and case dashboard components

