data "aws_iam_policy_document" "codebuild_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_cloudwatch_log_group" "codebuild" {
  name              = "/aws/codebuild/${local.name}-pr-preview"
  retention_in_days = 30
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
          "servicediscovery:GetService",
          "servicediscovery:ListServices"
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
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:ModifyTargetGroupAttributes"
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
      },
      {
        Effect = "Allow"
        Action = [
          "codeconnections:UseConnection",
          # CodeBuild also calls GetConnection / GetConnectionToken internally
          # when fetching the OAuth token for the webhook's source clone.
          "codeconnections:GetConnection",
          "codeconnections:GetConnectionToken",
        ]
        Resource = [aws_codeconnections_connection.github.arn]
      }
    ]
  })
}

resource "aws_codebuild_project" "pr_preview" {
  name          = "${local.name}-pr-preview"
  service_role  = aws_iam_role.codebuild_preview.arn
  build_timeout = 30

  # v6 provider's UpdateProject omits the buildspec field when source.type
  # changes from GITHUB to NO_SOURCE, which AWS rejects. Force replacement
  # so the apply goes through CreateProject (which sends all fields).
  # Don't use create_before_destroy: the project name is fixed and AWS
  # rejects duplicate names. Taint the resource before apply to trigger
  # destroy-then-create.
  lifecycle {
    create_before_destroy = false
  }

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
      name  = "ALB_HTTPS_LISTENER_ARN"
      value = var.alb_acm_certificate_arn == "" ? "" : aws_lb_listener.https[0].arn
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
    environment_variable {
      name = "GITHUB_TOKEN"
      # Secret is JSON {"token":"<pat>"}; extract only the token key.
      value = "${var.github_pat_secret_arn}:token"
      type  = "SECRETS_MANAGER"
    }
    environment_variable {
      name  = "GITHUB_REPO_URL"
      value = var.github_repo_url
    }
    # Populated by the trigger Lambda on each StartBuild call. The Lambda
    # overrides these via the StartBuild env-var override mechanism so a
    # single CodeBuild project handles every PR.
    environment_variable {
      name  = "PR_NUMBER"
      value = "0"
    }
    environment_variable {
      name  = "PR_REF"
      value = "main"
    }
    environment_variable {
      name  = "PR_SHA"
      value = "manual"
    }
    environment_variable {
      name  = "PR_ACTION"
      value = "opened"
    }
  }

  source {
    # NO_SOURCE: the buildspec clones the public repository itself. We don't
    # use CodeConnections / CodeBuild webhooks because the
    # AWS CodeBuild service in this account is having trouble using the
    # authorized connection (persistent "User is not authorized" error).
    # Instead, a Lambda (deployed separately) listens to GitHub webhooks via
    # a Function URL and calls `codebuild:StartBuild` on PR events.
    type      = "NO_SOURCE"
    buildspec = file("${path.module}/../../buildspec/pr-preview.yml")
  }
}

# AWS-managed GitHub connection (kept in state for now; not actively used).
# Authorize once at https://ap-northeast-1.console.aws.amazon.com/codesuite/settings/connections
resource "aws_codeconnections_connection" "github" {
  provider      = aws.us_east_1
  provider_type = "GitHub"
  name          = "x-frontend"
}

# Webhook is NOT defined here on purpose. The CodeBuild service in this
# account has a persistent "User is not authorized to access connection"
# error that we can't bypass with IAM, CodeConnection region, GitHub App
# install, or terraform taint. The trigger now lives in a separate Lambda
# that listens to GitHub webhooks and calls `codebuild:StartBuild`
# directly. See infrastructure/scripts/ for the trigger setup.
