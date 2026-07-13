output "alb_dns_name" { value = aws_lb.web.dns_name }
output "cloud_map_api_dns" { value = "api.${local.namespace}" }
output "lambda_name" { value = try(aws_lambda_function.edge[0].function_name, null) }
output "lambda_function_url" { value = try(aws_lambda_function_url.edge[0].function_url, null) }
output "cloudfront_domain" { value = aws_cloudfront_distribution.main.domain_name }
output "cloudfront_id" { value = aws_cloudfront_distribution.main.id }
output "waf_web_acl_arn" { value = aws_wafv2_web_acl.main.arn }
output "ecr_repositories" { value = { api = aws_ecr_repository.api.repository_url, web = aws_ecr_repository.web.repository_url, lambda = aws_ecr_repository.lambda.repository_url } }
output "codebuild_project" { value = aws_codebuild_project.pr_preview.name }
