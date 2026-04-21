#!/bin/bash
# Domovanje - zagon vseh mikro frontendov
# Uporaba: ./start-frontend.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo " Domovanje - Zagon mikro frontendov"
echo "============================================"
echo ""

wait_for_port() {
  local port=$1
  local name=$2
  echo -n "  Cakam na $name (port $port)..."
  for i in $(seq 1 30); do
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
      echo " OK"
      return 0
    fi
    sleep 1
    echo -n "."
  done
  echo " timeout (nadaljujem vseeno)"
}

echo "[1/6] Zaganjam auth-mf (port 3001)..."
(cd "$SCRIPT_DIR/frontend/auth-mf" && npm start) &
AUTH_PID=$!

echo "[2/6] Zaganjam register-mf (port 3002)..."
(cd "$SCRIPT_DIR/frontend/register-mf" && npm start) &
REGISTER_PID=$!

echo "[3/6] Zaganjam property-mf (port 3031)..."
(cd "$SCRIPT_DIR/frontend/property-mf" && npm start) &
PROPERTY_PID=$!

echo "[4/6] Zaganjam residents-mf (port 3033)..."
(cd "$SCRIPT_DIR/frontend/residents-mf" && npm start) &
RESIDENTS_PID=$!

echo "[5/6] Zaganjam payment-mf (port 3035)..."
(cd "$SCRIPT_DIR/frontend/payment-mf" && npm start) &
PAYMENT_PID=$!

echo ""
echo "Cakam, da se MF-ji zazenejo..."
wait_for_port 3001 "auth-mf"
wait_for_port 3002 "register-mf"
wait_for_port 3031 "property-mf"
wait_for_port 3033 "residents-mf"
wait_for_port 3035 "payment-mf"

echo ""
echo "[6/6] Zaganjam container-app (port 3000)..."
(cd "$SCRIPT_DIR/frontend/container-app" && npm start) &
CONTAINER_PID=$!

echo ""
echo "============================================"
echo " Vse storitve tečejo:"
echo "   http://localhost:3000  - Aplikacija"
echo "   http://localhost:3001  - auth-mf"
echo "   http://localhost:3002  - register-mf"
echo "   http://localhost:3031  - property-mf"
echo "   http://localhost:3033  - residents-mf"
echo "   http://localhost:3035  - payment-mf"
echo "============================================"
echo ""
echo "Pritisni Ctrl+C za zaustavitev vseh procesov."

# Zaustavi vse procese ob Ctrl+C
trap "echo ''; echo 'Zaustavljam vse MF-je...'; kill $AUTH_PID $REGISTER_PID $PROPERTY_PID $RESIDENTS_PID $PAYMENT_PID $CONTAINER_PID 2>/dev/null; exit 0" INT TERM

wait
