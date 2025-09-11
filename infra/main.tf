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

# 🔐 Secrets creados por Terraform en Secrets Manager (sin consola)
resource "aws_secretsmanager_secret" "mongodb_uri" {
  name        = "${var.name_prefix}-MONGODB_URI"
  description = "MongoDB connection string for ${var.name_prefix}"
}

resource "aws_secretsmanager_secret_version" "mongodb_uri" {
  secret_id     = aws_secretsmanager_secret.mongodb_uri.id
  secret_string = var.mongodb_uri_value
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.name_prefix}-JWT_SECRET"
  description = "JWT secret for ${var.name_prefix}"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret_value
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

  # 👉 Secrets inyectados desde Secrets Manager (creados arriba)
  mongodb_uri_secret_arn = aws_secretsmanager_secret.mongodb_uri.arn
  jwt_secret_arn         = aws_secretsmanager_secret.jwt_secret.arn

  # ✅ Evita el error de 'count' en el módulo (habilita la policy para Secrets)
  secrets_enabled = true

  # 👉 Certificado generado y VALIDADO
  acm_certificate_arn = module.certificate.acm_certificate_arn
}

module "frontend" {
  source      = "./modules/frontend_s3_cf"
  name_prefix = var.name_prefix
  aws_region  = var.aws_region

  # Conectar con ALB dinámicamente y usar dominio propio del front
  alb_dns_name = module.backend_ecs.alb_dns
  front_domain = var.front_domain
  zone_id      = var.zone_id
}

# Alias DNS de la API → ALB (api.mozartia.com)
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
