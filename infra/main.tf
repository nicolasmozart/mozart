terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  # ⚠️ SIN backend aquí (el backend vive en providers.tf)
}

# ⚠️ SIN provider aquí (el provider vive en providers.tf)

module "registry_and_oidc" {
  source        = "./modules/registry_and_oidc"
  aws_region    = var.aws_region
  name_prefix   = var.name_prefix
  github_repo   = var.github_repo
  github_branch = var.github_branch
  ecr_repo_name = var.ecr_repo_name
}

module "backend_ecs" {
  source            = "./modules/backend_ecs"
  aws_region        = var.aws_region
  name_prefix       = var.name_prefix
  ecr_repo_url      = module.registry_and_oidc.repository_url
  image_tag         = "candidate"
  container_port    = 4000
  health_check_path = "/ping"
  desired_count     = 1

  mongodb_uri_secret_arn = try(var.mongodb_uri_secret_arn, null)
  jwt_secret_arn         = try(var.jwt_secret_arn, null)
}

module "frontend" {
  source      = "./modules/frontend_s3_cf"
  name_prefix = var.name_prefix
  aws_region  = var.aws_region
}
