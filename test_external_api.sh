#!/bin/sh
echo "=== Test 1: HTTPS via domain ==="
curl -sv -X POST "https://pixbeet.lat/api/email" \
  -H "Content-Type: application/json" \
  -d '{"to":"contato@pixbeet.lat","subject":"Test","html":"<p>test</p>"}' 2>&1

echo ""
echo "=== Test 2: HTTP via domain (expect redirect) ==="
curl -sv -X POST "http://pixbeet.lat/api/email" \
  -H "Content-Type: application/json" \
  -d '{"to":"contato@pixbeet.lat","subject":"Test","html":"<p>test</p>"}' 2>&1 | head -20

echo ""
echo "=== Test 3: Direct HTTP to VPS IP port 80 ==="
curl -sv -X POST "http://147.93.44.164/api/email" \
  -H "Content-Type: application/json" \
  -H "Host: pixbeet.lat" \
  -d '{"to":"contato@pixbeet.lat","subject":"Test","html":"<p>test</p>"}' 2>&1

echo ""
echo "=== Test 4: Long timeout test ==="
time curl -sv -X POST "https://pixbeet.lat/api/email" \
  -H "Content-Type: application/json" \
  -d '{"to":"contato@pixbeet.lat","subject":"Slow Test","html":"<p>test</p>"}' 2>&1 | grep -E "(200|502|success|error|real)"
