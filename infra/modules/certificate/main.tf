variable "api_domain" {
  type        = string
  description = "Dominio de la API (ej: api.mozartia.com)"
}

variable "zone_id" {
  type        = string
  description = "ID de la zona hospedada en Route53"
}

resource "aws_acm_certificate" "api_cert" {
  domain_name       = var.api_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api_cert_validation" {
  certificate_arn         = aws_acm_certificate.api_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

output "acm_certificate_arn" {
  value = aws_acm_certificate_validation.api_cert_validation.certificate_arn
}
