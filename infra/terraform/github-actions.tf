# GitHub Actions assumes this role through GitHub's OIDC provider. The role is
# deliberately limited to starting, observing, and stopping the single PR
# preview CodeBuild project; all deployment permissions remain on CodeBuild.

data "aws_iam_openid_connect_provider" "github_actions" {
  arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github_actions.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # pull_request workflows receive this stable subject. Restricting it to
    # one repository prevents workflows in other repositories from assuming
    # the deployment trigger role.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:pull_request"]
    }
  }
}

resource "aws_iam_role" "github_actions_preview" {
  name                 = "${local.name}-github-actions"
  description          = "Starts and observes PR preview CodeBuild jobs from GitHub Actions"
  assume_role_policy   = data.aws_iam_policy_document.github_actions_assume.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_actions_preview" {
  statement {
    sid    = "ManagePreviewBuild"
    effect = "Allow"
    actions = [
      "codebuild:StartBuild",
      "codebuild:BatchGetBuilds",
      "codebuild:StopBuild",
    ]
    resources = [aws_codebuild_project.pr_preview.arn]
  }
}

resource "aws_iam_role_policy" "github_actions_preview" {
  name   = "${local.name}-github-actions"
  role   = aws_iam_role.github_actions_preview.id
  policy = data.aws_iam_policy_document.github_actions_preview.json
}
