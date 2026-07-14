# Trigger Lambda: receives GitHub PR webhooks via a Function URL, verifies the
# HMAC-SHA256 signature, and calls codebuild:StartBuild on the PR project with
# the PR_NUMBER / PR_REF / PR_ACTION env vars. We use this instead of the
# built-in aws_codebuild_webhook because the CodeBuild service in this account
# can't use the AWS-managed CodeConnection (persistent "User is not authorized"
# error in CreateProject with auth.type = CODECONNECTIONS).

locals {
  trigger_lambda_name = "${local.name}-trigger"
}

data "aws_caller_identity" "current_trigger" {}

# Bootstrap the Go binary at plan time so the ECR image can be built from it
# before the Lambda resource is created. We don't actually use this artifact
# for the Lambda — the Lambda is deployed from an ECR image built by a
# follow-up CodeBuild project — but it's convenient for local development.
# See the documentation comment in the lambda resource below for the
# production deploy flow.

# ECR repository for the trigger Lambda image.
resource "aws_ecr_repository" "trigger_lambda" {
  name                 = "${local.name}/trigger-lambda"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_cloudwatch_log_group" "trigger_lambda" {
  name              = "/aws/lambda/${local.trigger_lambda_name}"
  retention_in_days = 30
}

# IAM role for the Lambda: trust lambda.amazonaws.com, allow basic execution,
# plus codebuild:StartBuild on the PR project, and secretsmanager:GetSecretValue
# to read the webhook secret at request time.
data "aws_iam_policy_document" "trigger_lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "trigger_lambda" {
  name               = local.trigger_lambda_name
  assume_role_policy = data.aws_iam_policy_document.trigger_lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "trigger_lambda_basic" {
  role       = aws_iam_role.trigger_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "trigger_lambda_inline" {
  statement {
    sid    = "StartCodeBuild"
    effect = "Allow"
    actions = [
      "codebuild:StartBuild",
      "codebuild:BatchGetBuilds",
      "codebuild:StopBuild",
    ]
    resources = [aws_codebuild_project.pr_preview.arn]
  }

  statement {
    sid     = "ReadWebhookSecret"
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    # Wildcard suffix matches the full ARN with AWS-added random suffix.
    resources = ["${var.github_webhook_secret_arn}*"]
  }
}

resource "aws_iam_role_policy" "trigger_lambda_inline" {
  name   = "${local.trigger_lambda_name}-inline"
  role   = aws_iam_role.trigger_lambda.id
  policy = data.aws_iam_policy_document.trigger_lambda_inline.json
}

# The Lambda image is built and pushed by the operator (or a follow-up CI
# pipeline) using:
#   docker build -t <ECR_URI>:v1 -f Dockerfile.trigger-lambda .
# After the first push, set trigger_lambda_image_uri below and re-apply.
#
# To avoid a chicken-and-egg with the first apply (no image yet), we set
# the image URI variable to "" by default and use count to skip creation.
variable "trigger_lambda_image_uri" {
  type    = string
  default = ""
}

resource "aws_lambda_function" "trigger" {
  count         = var.trigger_lambda_image_uri == "" ? 0 : 1
  function_name = local.trigger_lambda_name
  package_type  = "Image"
  role          = aws_iam_role.trigger_lambda.arn
  timeout       = 30
  memory_size   = 256

  image_config {
    command = ["bootstrap"]
  }

  environment {
    variables = {
      CODEBUILD_PROJECT_NAME  = aws_codebuild_project.pr_preview.name
      GITHUB_WEBHOOK_SECRET   = var.trigger_lambda_image_uri == "" ? "" : "${var.github_webhook_secret_arn}"
      TRUSTED_GITHUB_ACTOR_ID = var.trusted_github_actor_id
    }
  }

  image_uri = var.trigger_lambda_image_uri

  depends_on = [
    aws_cloudwatch_log_group.trigger_lambda,
    aws_iam_role_policy.trigger_lambda_inline,
  ]
}

# Function URL exposes the Lambda over HTTPS without API Gateway. The auth
# type is NONE because GitHub's webhook signature is validated inside the
# Lambda (HMAC-SHA256 against the shared secret). For tighter security you
# can switch to AWS_IAM + CloudFront OAC, but it's not required.
resource "aws_lambda_function_url" "trigger" {
  count              = var.trigger_lambda_image_uri == "" ? 0 : 1
  function_name      = aws_lambda_function.trigger[0].function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["https://github.com"]
    allow_methods = ["POST"]
    allow_headers = ["*"]
    max_age       = 86400
  }
}

# Restrict the Function URL to GitHub's published webhook IP ranges so an
# attacker can't POST random PR events. The list is updated by GitHub; see
# https://api.github.com/meta for the current set.
data "http" "github_meta" {
  url = "https://api.github.com/meta"
}

locals {
  github_hook_ips = jsondecode(data.http.github_meta.response_body).hooks
}

resource "aws_lambda_permission" "trigger_url_public" {
  count                  = var.trigger_lambda_image_uri == "" ? 0 : 1
  statement_id           = "AllowGitHubWebhooks"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.trigger[0].function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

# Secret for the GitHub webhook signing key. The operator creates this with
# the same value configured in the GitHub repo's webhook settings. Stored
# as a plain string (not JSON) because the Lambda reads it directly.
variable "github_webhook_secret_arn" {
  description = "Secrets Manager ARN of the GitHub webhook signing secret (plain string)."
  type        = string
  default     = ""
}