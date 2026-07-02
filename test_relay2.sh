#!/bin/sh
CID=$(docker ps -q -f name=pixbeet-stack_pixbeet)
echo "=== Installing curl ==="
docker exec $CID sh -c "apk add --no-cache curl >/dev/null 2>&1"
echo "=== Testing relay ==="
docker exec $CID sh -c "curl -s -X POST http://email-relay:3001/ -H 'Content-Type: application/json' -d '{\"to\":\"contato@pixbeet.lat\",\"subject\":\"Test\",\"html\":\"<p>test</p>\"}'"
echo ""
echo "=== Testing via localhost/api/email ==="
docker exec $CID sh -c "curl -s -X POST http://localhost:80/api/email -H 'Content-Type: application/json' -d '{\"to\":\"contato@pixbeet.lat\",\"subject\":\"Test\",\"html\":\"<p>test</p>\"}'"
