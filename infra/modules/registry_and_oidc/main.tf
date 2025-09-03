#############################################
# modules/registry_and_oidc/main.tf
# - Crea el repositorio ECR
# - Crea el OIDC provider de GitHub
# - Rol IAM para que GitHub Actions asuma vía OIDC
# - Permisos mínimos para build/push a ECR + redeploy en ECS
#############################################

# Repositorio ECR
resource "aws_ecr_repository" "repo" {
  name                 = var.ecr_repo_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle {
    prevent_destroy = true   # evita borrarlo por accidente
  }
}

# OIDC provider de GitHub (thumbprint vigente)
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Trust policy: permite que tu repo/branch (y tags) asuman el rol
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:ref:refs/heads/${var.github_branch}",
        "repo:${var.github_repo}:ref:refs/tags/*"
      ]
    }
  }
}

# Rol que asumirá GitHub Actions
resource "aws_iam_role" "gha_role" {
  name               = "${var.name_prefix}-gha-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# Política con permisos: ECR (build/push) + ECS (redeploy)
data "aws_iam_policy_document" "gha_policy" {
  statement {
    actions = [
      # --- ECR (build/push) ---
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",

      # --- ECS (redeploy desde GitHub Actions) ---
      "ecs:UpdateService",
      "ecs:DescribeServices",
      "ecs:DescribeClusters"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "gha" {
  name   = "${var.name_prefix}-gha-policy"
  policy = data.aws_iam_policy_document.gha_policy.json
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.gha_role.name
  policy_arn = aws_iam_policy.gha.arn
}
