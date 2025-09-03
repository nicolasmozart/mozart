# Outputs del backend ECS (módulo activo)
output "alb_dns" {
  value = module.backend_ecs.alb_dns
}
output "cluster_name" {
  value = module.backend_ecs.cluster_name
}
output "service_name" {
  value = module.backend_ecs.service_name
}

# (Opcional) seguir mostrando la URL del ECR sin depender del otro módulo
output "ecr_repository_url" {
  value = var.ecr_repo_url
}

output "front_bucket"          { value = module.frontend.bucket_name }
output "front_distribution_id" { value = module.frontend.distribution_id }
output "front_cf_domain"       { value = module.frontend.cf_domain }
