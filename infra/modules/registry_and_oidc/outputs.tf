output "ecr_repository_url" { value = aws_ecr_repository.repo.repository_url }
output "gha_role_arn" { value = aws_iam_role.gha_role.arn }
