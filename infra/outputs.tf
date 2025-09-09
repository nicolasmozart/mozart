# Outputs del backend ECS
output "alb_dns" {
  value = module.backend_ecs.alb_dns
}
output "cluster_name" {
  value = module.backend_ecs.cluster_name
}
output "service_name" {
  value = module.backend_ecs.service_name
}

# (Opcional) seguir mostrando la URL del ECR del módulo
output "ecr_repository_url" {
  value = module.registry_and_oidc.repository_url
}

# Outputs del frontend
output "front_bucket" {
  value = module.frontend.bucket_name
}
output "front_distribution_id" {
  value = module.frontend.distribution_id
}
output "front_cf_domain" {
  value = module.frontend.cf_domain
}

# Rol OIDC para GitHub Actions (útil para workflows)
output "gha_role_arn" {
  value = module.registry_and_oidc.gha_role_arn
}
