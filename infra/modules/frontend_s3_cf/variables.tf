variable "name_prefix" { type = string }
variable "aws_region" { type = string }

variable "index_document" {
  type    = string
  default = "index.html"
}

# NUEVO: DNS del ALB para usarlo como origin del backend
variable "alb_dns_name" {
  type        = string
  description = "DNS name del ALB para usar como origin en CloudFront"
}

# NUEVO: dominio propio del frontend (ej: app.mozartia.com)
variable "front_domain" {
  type        = string
  description = "Dominio del frontend para CloudFront"
}

# NUEVO: Hosted Zone ID de la zona principal (mozartia.com)
variable "zone_id" {
  type        = string
  description = "Hosted Zone ID de Route 53 para crear alias del front"
}
