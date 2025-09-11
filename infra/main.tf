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

# 🔑 Certificado de la API
module "certificate" {
  source     = "./modules/certificate"
  api_domain = var.api_domain # ej: "api.mozartia.com"
  zone_id    = var.zone_id    # Hosted Zone ID de Route 53
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

  # 👉 Certificado generado y VALIDADO
  acm_certificate_arn = module.certificate.acm_certificate_arn
}

module "frontend" {
  source      = "./modules/frontend_s3_cf"
  name_prefix = var.name_prefix
  aws_region  = var.aws_region

  # NUEVO: conectar con ALB dinámicamente y usar dominio propio del front
  alb_dns_name = module.backend_ecs.alb_dns
  front_domain = var.front_domain
  zone_id      = var.zone_id
}

# NUEVO: Alias DNS de la API → ALB (api.mozartia.com)
resource "aws_route53_record" "api_alias" {
  zone_id = var.zone_id
  name    = var.api_domain
  type    = "A"

  alias {
    name                   = module.backend_ecs.alb_dns
    zone_id                = module.backend_ecs.alb_zone_id
    evaluate_target_health = false
  }
}
