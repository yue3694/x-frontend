variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "project_name" {
  type    = string
  default = "neural-synthesis"
}
variable "environment" {
  type    = string
  default = "production"
}
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "github_repo_url" { type = string }
variable "github_repository" {
  description = "GitHub repository in owner/name form allowed to assume the Actions OIDC role."
  type        = string
  default     = "yue3694/x-frontend"
}
variable "github_pat_secret_arn" {
  description = "Secrets Manager ARN whose secret_string is a raw GitHub PAT (no JSON wrapper). Used by aws_codebuild_source_credential to clone the repo on PR builds."
  type        = string
  sensitive   = true
}
variable "database_url_secret_arn" {
  type      = string
  sensitive = true
}
variable "auth_jwt_secret_arn" {
  type      = string
  sensitive = true
}
variable "cloudflare_zone_id" { type = string }
variable "cloudflare_token_secret_arn" {
  type      = string
  sensitive = true
}
variable "preview_domain" { type = string }
variable "alb_acm_certificate_arn" {
  description = "ACM certificate in the application region for the ALB HTTPS listener."
  type        = string
  default     = ""
}
variable "trusted_github_actor_id" { type = string }
variable "lambda_image_uri" {
  type    = string
  default = ""
}
variable "container_cpu" {
  type    = number
  default = 512
}
variable "container_memory" {
  type    = number
  default = 1024
}
# Optional aliases for the CloudFront distribution. When empty, the
# distribution serves the *.cloudfront.net default domain and relies on
# TLS from the AWS default certificate. Set this together with
# cloudfront_acm_cert_arn when you front the app with a custom domain.
variable "cloudfront_aliases" {
  type    = list(string)
  default = []
}
variable "cloudfront_acm_cert_arn" {
  type    = string
  default = ""
}
