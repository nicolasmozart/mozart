module "registry_and_oidc" {
  source        = "./modules/registry_and_oidc"
  aws_region    = var.aws_region
  name_prefix   = var.name_prefix
  github_repo   = var.github_repo
  github_branch = var.github_branch
  ecr_repo_name = var.ecr_repo_name
}

module "backend_ecs" {
  source                 = "./modules/backend_ecs"
  aws_region             = var.aws_region
  name_prefix            = var.name_prefix
  ecr_repo_url           = var.ecr_repo_url
  image_tag              = "candidate"
  container_port         = 4000          # Mozart2.0
  health_check_path      = "/ping"       # Mozart2.0
  desired_count          = 1

  # (opcionales) si usas Secrets Manager:
  mongodb_uri_secret_arn = try(var.mongodb_uri_secret_arn, null)
  jwt_secret_arn         = try(var.jwt_secret_arn, null)
}

module "frontend" {
  source      = "./modules/frontend_s3_cf"
  name_prefix = var.name_prefix
  aws_region  = var.aws_region
}
