variable "aws_region" {
  type = string
}

variable "name_prefix" {
  type = string
  # ej: "mozart-cemdi"
}

variable "github_repo" {
  type = string
  # ej: "nicolasmozart/mozart"
}

variable "github_branch" {
  type = string
  # ej: "main"
}

variable "ecr_repo_name" {
  type = string
  # ej: "mozart-ips"
}

# 🔹 Dummy por ahora, luego se llenan con Secrets Manager
variable "mongodb_uri_secret_arn" {
  type    = string
  default = null
}

variable "jwt_secret_arn" {
  type    = string
  default = null
}

# 🔑 Dominio y zone_id para cert ACM (API)
variable "api_domain" {
  type        = string
  description = "Dominio de la API (ej: api.mozartia.com)"
}

variable "zone_id" {
  type        = string
  description = "ID de la zona hospedada en Route53"
}

# ✨ NUEVO: dominio propio del front
variable "front_domain" {
  type        = string
  description = "Dominio del frontend (ej: app.mozartia.com)"
}
