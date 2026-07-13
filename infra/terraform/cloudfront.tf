# CloudFront sits in front of the public web ALB and the private edge Lambda.
# The ALB continues to serve the SSR Next.js app on :80 (Cloudflare proxies TLS
# upstream to this same distribution for the preview envs, so behavior is
# consistent across prod and PRs). The Lambda Function URL is the only public
# way to reach the private Go API in this VPC.

locals {
  cf_aliases     = compact(var.cloudfront_aliases)
  cf_price_class = "PriceClass_100"
}

# CloudFront + WAFv2 (scope = CLOUDFRONT) must live in us-east-1. We declare
# the alias only inside this file so the rest of the stack stays in var.aws_region.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      Application = var.project_name
      ManagedBy   = "terraform"
    }
  }
}

# WAF = "FareGate" in the design notes. Managed rules block common exploits;
# the rate-based rule keeps a single client from saturating the Lambda origin.
resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name}-faregate"
  description = "Edge WAF in front of the public distribution"
  scope       = "CLOUDFRONT"
  provider    = aws.us_east_1

  # WAFv2 CLOUDFRONT scope rejects the provider-injected default_tags in some
  # regions with WAFNonexistentItemException. Override to an empty map so the
  # API call never sends Tags.
  tags = {}

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        # The rule group's API name ends in "RuleSet" (the managed_rule_group
        # list API shows the full name; Terraform docs sometimes drop the
        # suffix, which causes WAF to return WAFNonexistentItemException).
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "known-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 30
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitPerIP"
    priority = 40
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-faregate"
    sampled_requests_enabled   = true
  }
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = "${local.name} public entry"
  price_class         = local.cf_price_class
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  web_acl_id          = aws_wafv2_web_acl.main.arn
  aliases             = local.cf_aliases
  default_root_object = ""

  origin {
    domain_name = aws_lb.web.dns_name
    origin_id   = "alb-web"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Lambda origin only exists once lambda_image_uri is set; build it
  # conditionally so the first apply (no image yet) doesn't dereference
  # an empty tuple. The edge Lambda + Function URL are gated by the
  # same condition in main.tf.
  dynamic "origin" {
    for_each = var.lambda_image_uri == "" ? [] : [1]
    content {
      domain_name = aws_lambda_function_url.edge[0].url_id
      origin_id   = "lambda-edge"
      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior {
    target_origin_id         = "alb-web"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewer
  }

  # The Go API is reachable only through the edge Lambda (which calls the
  # private Cloud Map service). /api/health probes the upstream; expand this
  # behavior as more endpoints get wired through the BFF or Lambda directly.
  dynamic "ordered_cache_behavior" {
    for_each = var.lambda_image_uri == "" ? [] : [1]
    content {
      path_pattern             = "/api/*"
      target_origin_id         = "lambda-edge"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["GET", "HEAD", "OPTIONS"]
      cached_methods           = ["GET", "HEAD"]
      compress                 = true
      cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
      origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = length(local.cf_aliases) == 0 ? true : null
    acm_certificate_arn            = length(local.cf_aliases) > 0 ? var.cloudfront_acm_cert_arn : null
    ssl_support_method             = length(local.cf_aliases) > 0 ? "sni-only" : null
    minimum_protocol_version       = length(local.cf_aliases) > 0 ? "TLSv1.2_2021" : null
  }

  depends_on = [aws_wafv2_web_acl.main]
}
