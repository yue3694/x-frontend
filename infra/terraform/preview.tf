data "aws_iam_policy_document" "codebuild_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild_preview" {
  name               = "${local.name}-pr-preview"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume.json
}

resource "aws_iam_role_policy" "codebuild_preview" {
  name = "${local.name}-pr-preview"
  role = aws_iam_role.codebuild_preview.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.codebuild.arn}:*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = [
          aws_ecr_repository.api.arn,
          aws_ecr_repository.web.arn,
          aws_ecr_repository.lambda.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:CreateService",
          "ecs:UpdateService",
          "ecs:DeleteService",
          "ecs:DescribeServices"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [aws_iam_role.ecs_execution.arn, aws_iam_role.ecs_task.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "servicediscovery:CreateService",
          "servicediscovery:DeleteService",
          "servicediscovery:GetService"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:DeleteRule",
          "elasticloadbalancing:DescribeRules"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        # Use wildcard suffix to match the full ARN (with AWS-added random
        # suffix) that CodeBuild actually requests at webhook creation.
        Resource = [
          "${var.github_pat_secret_arn}*",
          "${var.cloudflare_token_secret_arn}*",
        ]
      }
    ]
  })
}

resource "aws_codebuild_project" "pr_preview" {
  name          = "${local.name}-pr-preview"
  service_role  = aws_iam_role.codebuild_preview.arn
  build_timeout = 30

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_MEDIUM"
    image           = "aws/codebuild/standard:7.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = true

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
      name  = "AWS_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "API_REPOSITORY"
      value = aws_ecr_repository.api.repository_url
    }
    environment_variable {
      name  = "WEB_REPOSITORY"
      value = aws_ecr_repository.web.repository_url
    }
    environment_variable {
      name  = "LAMBDA_REPOSITORY"
      value = aws_ecr_repository.lambda.repository_url
    }
    environment_variable {
      name  = "ECS_CLUSTER"
      value = aws_ecs_cluster.main.name
    }
    environment_variable {
      name  = "PRIVATE_SUBNET_IDS"
      value = join(",", var.private_subnet_ids)
    }
    environment_variable {
      name  = "WEB_SECURITY_GROUP"
      value = aws_security_group.web.id
    }
    environment_variable {
      name  = "API_SECURITY_GROUP"
      value = aws_security_group.api.id
    }
    environment_variable {
      name  = "CLOUD_MAP_NAMESPACE_ID"
      value = aws_service_discovery_private_dns_namespace.internal.id
    }
    environment_variable {
      name  = "CLOUD_MAP_NAMESPACE"
      value = local.namespace
    }
    environment_variable {
      name  = "ALB_LISTENER_ARN"
      value = aws_lb_listener.http.arn
    }
    environment_variable {
      name  = "ALB_DNS_NAME"
      value = aws_lb.web.dns_name
    }
    environment_variable {
      name  = "VPC_ID"
      value = var.vpc_id
    }
    environment_variable {
      name  = "PREVIEW_DOMAIN"
      value = var.preview_domain
    }
    environment_variable {
      name  = "CLOUDFLARE_ZONE_ID"
      value = var.cloudflare_zone_id
    }
    environment_variable {
      name  = "CLOUDFLARE_TOKEN"
      value = "${var.cloudflare_token_secret_arn}:token"
      type  = "SECRETS_MANAGER"
    }
  }

  source {
    type      = "GITHUB"
    location  = var.github_repo_url
    buildspec = file("${path.module}/../../buildspec/pr-preview.yml")

    # The AWS CodeBuild API only accepts OAUTH / CODECONNECTIONS / SECRETS_MANAGER
    # for Source.Auth.Type. v6 provider's enum is misleading — store the PAT in
    # Secrets Manager and reference it via the AWS-managed CodeStarSourceCredentials
    # machinery under the hood.
    #
    # CodeBuild requires the FULL secret ARN including the random 6-char suffix
    # (e.g. ".../github-pat-AbCdEf"). The partial ARN in tfvars (without suffix)
    # is rejected with "not a valid secrets manager secret arn". Look it up.
    auth {
      type     = "SECRETS_MANAGER"
      resource = data.aws_secretsmanager_secret.github_pat.arn
    }
  }
}

# Resolve the secret name to its full ARN (which includes the random suffix
# AWS appends on creation). CodeBuild rejects partial ARNs.
data "aws_secretsmanager_secret" "github_pat" {
  arn = var.github_pat_secret_arn
}

resource "aws_codebuild_webhook" "pr_preview" {
  project_name = aws_codebuild_project.pr_preview.name

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED,PULL_REQUEST_REOPENED,PULL_REQUEST_CLOSED"
    }
    filter {
      type    = "BASE_REF"
      pattern = "^refs/heads/main$"
    }
    filter {
      type    = "ACTOR_ACCOUNT_ID"
      pattern = var.trusted_github_actor_id
    }
  }
}
