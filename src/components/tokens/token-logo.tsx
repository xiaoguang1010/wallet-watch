'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const SYMBOL_OVERRIDES: Record<string, string> = {
  // Common aliases / chain-native naming differences
  tron: 'trx',
  trx: 'trx',
  bitcoin: 'btc',
  btc: 'btc',
  ethereum: 'eth',
  eth: 'eth',
  tether: 'usdt',
  usdt: 'usdt',
  'weth': 'eth',
  'wbtc': 'btc',
};

function normalizeSymbol(symbol: string) {
  return (symbol || '').trim().toLowerCase();
}

function getTokenLogoUrl(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  const iconSymbol = SYMBOL_OVERRIDES[normalized] ?? normalized;

  if (!iconSymbol) return null;

  // Public icon set (GitHub raw). We keep this centralized so we can swap CDN later if needed.
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${iconSymbol}.png`;
}

export function TokenLogo({
  symbol,
  size = 16,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  const src = useMemo(() => getTokenLogoUrl(symbol), [symbol]);
  const fallbackText = (symbol || '?').trim().slice(0, 3).toUpperCase();

  if (!src || errored) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold leading-none',
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(8, Math.floor(size * 0.5)) }}
        aria-label={`${symbol} logo`}
        title={symbol}
      >
        {fallbackText.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}


