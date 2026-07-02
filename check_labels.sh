#!/bin/sh
echo "=== pixbeet service labels ==="
docker service inspect pixbeet-stack_pixbeet --format '{{json .Spec.Labels}}' 2>/dev/null | python3 -m json.tool 2>/dev/null || docker service inspect pixbeet-stack_pixbeet --format '{{range $k,$v := .Spec.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null
echo ""
echo "=== Traefik recent logs ==="
CID=$(docker ps -q -f name=traefik_traefik)
docker exec $CID sh -c "tail -20 /var/log/traefik/access-log" 2>/dev/null | grep -i pixbeet
echo ""
echo "=== nginx docker logs ==="
docker logs $(docker ps -q -f name=pixbeet-stack_pixbeet) --tail 20 2>&1
