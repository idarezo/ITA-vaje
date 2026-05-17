#!/bin/bash
# Zgradi in naloži vse Docker slike na Docker Hub
# Uporaba: ./build-and-push.sh

DOCKER_USER="idarezo123"
GW_URL="https://web-gateway-idarezo-dev.apps.rm3.7wse.p1.openshiftapps.com"
AUTH_URL="https://auth-mf-idarezo-dev.apps.rm3.7wse.p1.openshiftapps.com"
REGISTER_URL="https://register-mf-idarezo-dev.apps.rm3.7wse.p1.openshiftapps.com"
PROPERTY_URL="https://property-mf-idarezo-dev.apps.rm3.7wse.p1.openshiftapps.com"
RESIDENTS_URL="https://residents-mf-idarezo-dev.apps.rm3.7wse.p1.openshiftapps.com"
PAYMENT_URL="https://payment-mf-idarezo-dev.apps.rm3.7wse.p1.openshiftapps.com"

echo "Prijava v Docker Hub..."
docker login

# ── Backend servisi ──────────────────────────────────────────────────────────
backend_services=("property-service" "residents-service" "user-service" "payment-service" "web-gateway" "mobile-gateway")

for service in "${backend_services[@]}"; do
  echo ""
  echo ">>> Gradim $service..."
  docker build -t $DOCKER_USER/$service:latest ./$service
  echo ">>> Nalagam $DOCKER_USER/$service:latest..."
  docker push $DOCKER_USER/$service:latest
done

# ── Frontend micro frontends ─────────────────────────────────────────────────
echo ""
echo ">>> Gradim auth-mf..."
docker build \
  --build-arg REACT_APP_API_BASE_URL=$GW_URL \
  --build-arg REACT_APP_PUBLIC_URL=$AUTH_URL/ \
  -t $DOCKER_USER/auth-mf:latest ./frontend/auth-mf
docker push $DOCKER_USER/auth-mf:latest

echo ""
echo ">>> Gradim register-mf..."
docker build \
  --build-arg REACT_APP_API_BASE_URL=$GW_URL \
  --build-arg REACT_APP_PUBLIC_URL=$REGISTER_URL/ \
  -t $DOCKER_USER/register-mf:latest ./frontend/register-mf
docker push $DOCKER_USER/register-mf:latest

echo ""
echo ">>> Gradim property-mf..."
docker build \
  --build-arg API_BASE_URL=$GW_URL \
  --build-arg PUBLIC_PATH=$PROPERTY_URL/ \
  -t $DOCKER_USER/property-mf:latest ./frontend/property-mf
docker push $DOCKER_USER/property-mf:latest

echo ""
echo ">>> Gradim residents-mf..."
docker build \
  --build-arg API_BASE_URL=$GW_URL \
  --build-arg PUBLIC_PATH=$RESIDENTS_URL/ \
  -t $DOCKER_USER/residents-mf:latest ./frontend/residents-mf
docker push $DOCKER_USER/residents-mf:latest

echo ""
echo ">>> Gradim payment-mf..."
docker build \
  --build-arg API_BASE_URL=$GW_URL \
  --build-arg PUBLIC_PATH=$PAYMENT_URL/ \
  -t $DOCKER_USER/payment-mf:latest ./frontend/payment-mf
docker push $DOCKER_USER/payment-mf:latest

echo ""
echo ">>> Gradim container-app..."
docker build \
  --build-arg REACT_APP_API_BASE_URL=$GW_URL \
  --build-arg REACT_APP_AUTH_MF_URL=$AUTH_URL \
  --build-arg REACT_APP_PROPERTY_MF_URL=$PROPERTY_URL \
  --build-arg REACT_APP_RESIDENTS_MF_URL=$RESIDENTS_URL \
  --build-arg REACT_APP_PAYMENT_MF_URL=$PAYMENT_URL \
  -t $DOCKER_USER/container-app:latest ./frontend/container-app
docker push $DOCKER_USER/container-app:latest

echo ""
echo "Vse slike so naložene na Docker Hub!"
