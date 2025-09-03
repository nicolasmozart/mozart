module "registry_and_oidc" {
  source        = "./modules/registry_and_oidc"
  aws_region    = var.aws_region
  name_prefix   = var.name_prefix
  github_repo   = var.github_repo
  github_branch = var.github_branch
  ecr_repo_name = var.ecr_repo_name
 }

#output "ecr_repository_url" { value = module.registry_and_oidc.ecr_repository_url }
#output "gha_role_arn" { value = module.registry_and_oidc.gha_role_arn }

module "backend_ecs" {
  source            = "./modules/backend_ecs"
  aws_region        = var.aws_region
  name_prefix       = var.name_prefix
  ecr_repo_url      = var.ecr_repo_url
  image_tag         = "candidate"
  container_port    = 8080
  health_check_path = "/health"
  desired_count     = 1
}
