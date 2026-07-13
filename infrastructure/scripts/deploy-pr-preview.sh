#!/usr/bin/env bash
set -euo pipefail

pr_number="$1"
image_tag="$2"
service_suffix="pr-${pr_number}"
api_service="${service_suffix}-api"
web_service="${service_suffix}-web"
api_dns="${api_service}.${CLOUD_MAP_NAMESPACE}"
host="pr-${pr_number}.${PREVIEW_DOMAIN}"

IFS=',' read -r -a private_subnets <<<"${PRIVATE_SUBNET_IDS}"
subnets_json=$(printf '"%s",' "${private_subnets[@]}" | sed 's/,$//')
network_api="awsvpcConfiguration={subnets=[$(IFS=,; echo "${private_subnets[*]}")],securityGroups=[$API_SECURITY_GROUP],assignPublicIp=DISABLED}"
network_web="awsvpcConfiguration={subnets=[$(IFS=,; echo "${private_subnets[*]}")],securityGroups=[$WEB_SECURITY_GROUP],assignPublicIp=DISABLED}"

upsert_cloud_map_service() {
  local id
  id=$(aws servicediscovery list-services --query "Services[?Name=='${api_service}'].Id | [0]" --output text)
  if [[ "$id" == "None" || -z "$id" ]]; then
    id=$(aws servicediscovery create-service --name "$api_service" --namespace-id "$CLOUD_MAP_NAMESPACE_ID" --dns-config "NamespaceId=$CLOUD_MAP_NAMESPACE_ID,RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=10}]" --health-check-custom-config FailureThreshold=1 --query 'Service.Id' --output text)
  fi
  echo "$id"
}

register_preview_task_definition() {
  local source_family="$1" target_family="$2" image="$3" api_url="${4:-}"
  local task_json
  task_json=$(aws ecs describe-task-definition --task-definition "$source_family" --query taskDefinition --output json | jq \
    --arg family "$target_family" --arg image "$image" --arg api_url "$api_url" '
      del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)
      | .family = $family
      | .containerDefinitions[0].image = $image
      | if $api_url == "" then . else .containerDefinitions[0].environment = ((.containerDefinitions[0].environment // []) | map(select(.name != "GO_API_URL")) + [{name:"GO_API_URL",value:$api_url}]) end')
  aws ecs register-task-definition --cli-input-json "$task_json" --query 'taskDefinition.taskDefinitionArn' --output text
}

ensure_service() {
  local name="$1" task_definition="$2" network="$3" registry_arn="${4:-}" target_group_arn="${5:-}"
  if aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$name" --query 'services[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
    if [[ -n "$target_group_arn" ]]; then
      aws ecs update-service --cluster "$ECS_CLUSTER" --service "$name" --task-definition "$task_definition" --load-balancers "targetGroupArn=$target_group_arn,containerName=web,containerPort=3000" --force-new-deployment >/dev/null
    else
      aws ecs update-service --cluster "$ECS_CLUSTER" --service "$name" --task-definition "$task_definition" --force-new-deployment >/dev/null
    fi
  elif [[ -n "$registry_arn" ]]; then
    aws ecs create-service --cluster "$ECS_CLUSTER" --service-name "$name" --task-definition "$task_definition" --desired-count 1 --launch-type FARGATE --network-configuration "$network" --service-registries "registryArn=$registry_arn" >/dev/null
  else
    aws ecs create-service --cluster "$ECS_CLUSTER" --service-name "$name" --task-definition "$task_definition" --desired-count 1 --launch-type FARGATE --network-configuration "$network" --load-balancers "targetGroupArn=$target_group_arn,containerName=web,containerPort=3000" >/dev/null
  fi
}

cloud_map_service_id=$(upsert_cloud_map_service)
cloud_map_service_arn="arn:aws:servicediscovery:${AWS_REGION}:${AWS_ACCOUNT_ID}:service/${cloud_map_service_id}"
api_task=$(register_preview_task_definition "${ECS_CLUSTER}-api" "${api_service}" "${API_REPOSITORY}:${image_tag}")
web_task=$(register_preview_task_definition "${ECS_CLUSTER}-web" "${web_service}" "${WEB_REPOSITORY}:${image_tag}" "http://${api_dns}:8080")
ensure_service "$api_service" "$api_task" "$network_api" "$cloud_map_service_arn"

# A target group and host rule isolate each PR without exposing the Go service.
target_group_arn=$(aws elbv2 describe-target-groups --names "${web_service}" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)
if [[ "$target_group_arn" == "None" || -z "$target_group_arn" ]]; then
  target_group_arn=$(aws elbv2 create-target-group --name "$web_service" --protocol HTTP --port 3000 --target-type ip --vpc-id "$VPC_ID" --health-check-path / --matcher HttpCode=200-399 --query 'TargetGroups[0].TargetGroupArn' --output text)
fi
ensure_service "$web_service" "$web_task" "$network_web" "" "$target_group_arn"

if ! aws elbv2 describe-rules --listener-arn "$ALB_LISTENER_ARN" --query "Rules[?Conditions[?Field=='host-header' && Values[0]=='${host}']] | length(@)" --output text | grep -q '^1$'; then
  priority=$((1000 + pr_number))
  aws elbv2 create-rule --listener-arn "$ALB_LISTENER_ARN" --priority "$priority" --conditions "Field=host-header,Values=${host}" --actions "Type=forward,TargetGroupArn=${target_group_arn}" >/dev/null
fi

# The token must be stored as {"token":"..."} in Secrets Manager. The record
# is proxied so Cloudflare provides TLS and keeps the ALB hostname private.
record=$(curl -fsS -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=CNAME&name=${host}" -H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" | jq -r '.result[0].id // empty')
payload=$(jq -nc --arg name "pr-${pr_number}" --arg content "${ALB_DNS_NAME}" '{type:"CNAME",name:$name,content:$content,proxied:true,ttl:1}')
if [[ -n "$record" ]]; then
  curl -fsS -X PUT "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record}" -H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" -H 'Content-Type: application/json' --data "$payload" >/dev/null
else
  curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" -H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" -H 'Content-Type: application/json' --data "$payload" >/dev/null
fi

echo "Preview ready: https://${host}"
