#!/bin/sh
CID=$(docker ps -q -f name=pixbeet-stack_pixbeet)
echo "=== nginx config ==="
docker exec $CID cat /etc/nginx/conf.d/default.conf
echo ""
echo "=== nginx error log ==="
docker exec $CID sh -c "cat /var/log/nginx/error.log 2>/dev/null | tail -20" || echo "no error log"
echo ""
echo "=== nginx access log ==="
docker exec $CID sh -c "cat /var/log/nginx/access.log 2>/dev/null | tail -20" || echo "no access log"
echo ""
echo "=== DNS resolution check ==="
docker exec $CID sh -c "getent hosts email-relay" 2>/dev/null || echo "getent not available"
docker exec $CID sh -c "nslookup email-relay 2>&1" || echo "nslookup not available"
