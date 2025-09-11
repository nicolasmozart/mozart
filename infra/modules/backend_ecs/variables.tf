variable "aws_region" { type = string }
variable "name_prefix" { type = string }
variable "ecr_repo_url" { type = string }
variable "image_tag" { type = string }
variable "container_port" { type = number }
variable "health_check_path" { type = string }
variable "desired_count" { type = number }

# Secretos opcionales (ARNs de AWS Secrets Manager)
variable "mongodb_uri_secret_arn" {
  type    = string
  default = null
}

variable "jwt_secret_arn" {
  type    = string
  default = null
}

# Habilita la creación de la policy de Secrets (evita 'unknown count' en plan)
variable "secrets_enabled" {
  type        = bool
  default     = false
  description = "Si true, crea la policy/attach para leer Secrets Manager."
}

# Certificado ACM para HTTPS
variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ARN del certificado ACM para HTTPS en el ALB"
}
