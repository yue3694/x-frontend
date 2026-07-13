#!/usr/bin/env bash
set -euo pipefail

pr_number="$1"
service_suffix="pr-${pr_number}"
api_service="${service_suffix}-api"
web_service="${service_suffix}-web"
host="pr-${pr_number}.${PREVIEW_DOMAIN}"

for service in "$api_service" "$web_service"; do
  if aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$service" --query 'services[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
    aws ecs update-service --cluster "$ECS_CLUSTER" --service "$service" --desired-count 0 >/dev/null
    aws ecs delete-service --cluster "$ECS_CLUSTER" --service "$service" --force >/dev/null
  fi
done

for rule in $(aws elbv2 describe-rules --listener-arn "$ALB_LISTENER_ARN" --query "Rules[?Conditions[?Field=='host-header' && Values[0]=='${host}']].RuleArn" --output text); do
  aws elbv2 delete-rule --rule-arn "$rule"
done

target_group_arn=$(aws elbv2 describe-target-groups --names "$web_service" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)
if [[ "$target_group_arn" != "None" && -n "$target_group_arn" ]]; then aws elbv2 delete-target-group --target-group-arn "$target_group_arn"; fi

cloud_map_id=$(aws servicediscovery list-services --query "Services[?Name=='${api_service}'].Id | [0]" --output text)
if [[ "$cloud_map_id" != "None" && -n "$cloud_map_id" ]]; then aws servicediscovery delete-service --id "$cloud_map_id"; fi

record=$(curl -fsS -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=CNAME&name=${host}" -H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" | jq -r '.result[0].id // empty')
if [[ -n "$record" ]]; then curl -fsS -X DELETE "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record}" -H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" >/dev/null; fi

echo "Preview removed: ${host}"
