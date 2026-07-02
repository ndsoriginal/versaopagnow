#!/bin/sh
echo "=== find pixbeet container ==="
docker ps -f name=pixbeet-stack_pixbeet --format '{{.ID}} {{.Names}} {{.Status}}'
CID=$(docker ps -q -f name=pixbeet-stack_pixbeet)
echo "=== Test relay directly ==="
docker exec $CID sh -c "curl -s -X POST http://email-relay:3001/ -H 'Content-Type: application/json' -d '{\"to\":\"contato@pixbeet.lat\",\"subject\":\"Test\",\"html\":\"<p>test</p>\"}'"
echo ""
echo "=== Test via localhost nginx ==="
docker exec $CID sh -c "curl -s -X POST http://localhost:80/api/email -H 'Content-Type: application/json' -d '{\"to\":\"contato@pixbeet.lat\",\"subject\":\"Test\",\"html\":\"<p>test</p>\"}'"
echo ""
echo "=== Check if email-relay is on same network ==="
echo "pixbeet overlay IP:"
docker exec $CID sh -c "ip addr show eth0 2>/dev/null | grep 'inet ' || cat /etc/hosts | grep email-relay"
echo ""
echo "=== Try with Traefik-like headers ==="
docker exec $CID sh -c "curl -s -X POST http://email-relay:3001/ -H 'Content-Type: application/json' -H 'X-Forwarded-For: 10.0.1.130' -H 'X-Forwarded-Proto: https' -d '{\"to\":\"contato@pixbeet.lat\",\"subject\":\"Test\",\"html\":\"<p>test</p>\"}'"
echo ""
echo "=== Try without Content-Type ==="
docker exec $CID sh -c "curl -s -X POST http://email-relay:3001/ -d '{\"to\":\"contato@pixbeet.lat\",\"subject\":\"Test\",\"html\":\"<p>test</p>\"}'"
