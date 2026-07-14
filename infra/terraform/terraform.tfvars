aws_region   = "ap-northeast-1"
project_name = "x-frontend"
environment  = "production"
vpc_id       = "vpc-0ddb4192af7c157ee"
# public subnets (1d + 1c) — host the ALB. 1c is also where NAT2 lives.
public_subnet_ids = ["subnet-02a142a616cfbd4fe", "subnet-0f00a089bf65915fa"]
# private subnets (1a + 1c) — host ECS Fargate tasks and the edge Lambda. NAT routes here.
private_subnet_ids = ["subnet-03faad68fb02087e9", "subnet-08a77f9876bc86462"]
github_repo_url    = "https://github.com/yue3694/x-frontend.git"
# Plain GitHub PAT stored as a raw string (not JSON). bootstrap-secrets.sh creates this.
github_pat_secret_arn       = "arn:aws:secretsmanager:ap-northeast-1:775086395318:secret:neural-synthesis-production/github-pat"
database_url_secret_arn     = "arn:aws:secretsmanager:ap-northeast-1:775086395318:secret:neural-synthesis-production/database-url"
auth_jwt_secret_arn         = "arn:aws:secretsmanager:ap-northeast-1:775086395318:secret:neural-synthesis-production/auth-jwt"
cloudflare_zone_id          = "481f24290a3d33558586eb1b707c5306"
cloudflare_token_secret_arn = "arn:aws:secretsmanager:ap-northeast-1:775086395318:secret:neural-synthesis-production/cloudflare"
preview_domain              = "preview.inxyu.cn"
trusted_github_actor_id     = "293815570" # only internal, trusted PR authors may deploy
# Leave empty during first apply. Push the edge Lambda image, then set to its immutable ECR digest and apply again.
lambda_image_uri = ""

# Trigger Lambda: receives GitHub PR webhooks and calls codebuild:StartBuild.
# Created by infrastructure/scripts/bootstrap-secrets.sh.
github_webhook_secret_arn = "arn:aws:secretsmanager:ap-northeast-1:775086395318:secret:neural-synthesis-production/github-webhook-secret-5TP10e"
# Image URI of the trigger Lambda (built from Dockerfile.trigger-lambda).
# Set to "<ECR>@sha256:<digest>" after pushing to ECR.
trigger_lambda_image_uri = "775086395318.dkr.ecr.ap-northeast-1.amazonaws.com/x-frontend-production/trigger-lambda@sha256:f39cb28d14aa825e76bae6deac5fece769bdb78ef55c420b330bf0a07d77ac90"

# Optional: custom aliases for the CloudFront distribution. Leave empty for
# the *.cloudfront.net default domain. When set, also provide the ACM cert
# ARN in us-east-1 that covers them.
# cloudfront_aliases         = ["app.example.com"]
# cloudfront_acm_cert_arn    = "arn:aws:acm:us-east-1:123456789012:certificate/..."
