#!/bin/bash
echo "💸 Simulating manual wallet funding..."

ADDR=$(cat ~/.lumen_wallet.txt 2>/dev/null)

if [ -z "$ADDR" ]; then
  echo "⚠️ No wallet found at ~/.lumen_wallet.txt"
  exit 1
fi

echo "Funding wallet address: $ADDR"
echo "Done. (Simulated — integrate with chain for live funding.)"
