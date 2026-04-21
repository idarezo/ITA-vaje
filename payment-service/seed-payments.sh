#!/bin/bash
# Seed 10 payments for Ana Kovač (propertyId=1, residentId=1)
# Usage: ./seed-payments.sh
# Requires: payment-service running on localhost:3004

BASE="http://localhost:3004/payments/rent"

months=(
  "Januar 2025|2025-01-20"
  "Februar 2025|2025-02-20"
  "Marec 2025|2025-03-21"
  "April 2025|2025-04-25"
  "Maj 2025|2025-05-20"
  "Junij 2025|2025-06-20"
  "Julij 2025|2025-07-21"
  "Avgust 2025|2025-08-20"
  "September 2025|2025-09-22"
  "Oktober 2025|2025-10-20"
)

for entry in "${months[@]}"; do
  desc="${entry%%|*}"
  due="${entry##*|}"
  echo -n "Ustvarjam: Najemnina - $desc ($due)... "
  curl -s -X POST "$BASE" \
    -H "Content-Type: application/json" \
    -d "{\"propertyId\":1,\"residentId\":1,\"amount\":950.00,\"currency\":\"EUR\",\"dueDate\":\"${due}T00:00:00Z\",\"description\":\"Najemnina - $desc\"}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK - ID:', d.get('paymentId','?'))" 2>/dev/null || echo "napaka"
done

echo ""
echo "Seed končan."
