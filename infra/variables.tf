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
