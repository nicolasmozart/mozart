#############################################
# S3 (sitio estático) + Public Access Block #
#############################################

resource "aws_s3_bucket" "front" {
  bucket = "${var.name_prefix}-front"
}

resource "aws_s3_bucket_public_access_block" "front" {
  bucket                  = aws_s3_bucket.front.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

#############################################
# CloudFront OAC (acceso privado al bucket) #
#############################################

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.name_prefix}-oac"
  description                       = "OAC for ${var.name_prefix} front"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

#########################################################
# Certificado ACM para el FRONT (app.mozartia.com)      #
#########################################################

resource "aws_acm_certificate" "front_cert" {
  domain_name       = var.front_domain
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "front_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.front_cert.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "front_cert_validation" {
  certificate_arn         = aws_acm_certificate.front_cert.arn
  validation_record_fqdns = [for r in aws_route53_record.front_cert_validation : r.fqdn]
}

#############################################
# CloudFront Distribution (S3 + ALB origins)#
#############################################

resource "aws_cloudfront_distribution" "dist" {
  enabled             = true
  comment             = "${var.name_prefix} front"
  default_root_object = var.index_document
  price_class         = "PriceClass_100"

  aliases = [var.front_domain]

  # ORIGEN S3 (frontend estático)
  origin {
    domain_name              = aws_s3_bucket.front.bucket_regional_domain_name
    origin_id                = "s3-${aws_s3_bucket.front.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # ORIGEN ALB (backend) - CF -> ALB por HTTP para evitar mixed content
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: servir S3 (app estática)
  default_cache_behavior {
    target_origin_id       = "s3-${aws_s3_bucket.front.id}"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }
  }

  # 1) /auth/* -> ALB (si tu auth no va bajo /api)
  ordered_cache_behavior {
    path_pattern           = "/auth/*"
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]
    min_ttl         = 0
    default_ttl     = 0
    max_ttl         = 0

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Authorization", "Content-Type", "Accept"]
      cookies { forward = "all" }
    }
  }

  # 2) /api/* -> ALB
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]
    min_ttl         = 0
    default_ttl     = 0
    max_ttl         = 0

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Authorization", "Content-Type", "Accept"]
      cookies { forward = "all" }
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.front_cert_validation.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # SPA fallbacks
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
}

#########################################################
# Bucket Policy: permitir lectura desde CloudFront (OAC)#
#########################################################

data "aws_iam_policy_document" "bucket_policy" {
  statement {
    sid       = "AllowCloudFrontRead"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.front.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.dist.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "front" {
  bucket = aws_s3_bucket.front.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}

#############################################
# Alias DNS del FRONT: app.mozartia.com     #
#############################################

resource "aws_route53_record" "front_alias" {
  zone_id = var.zone_id
  name    = var.front_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.dist.domain_name
    zone_id                = aws_cloudfront_distribution.dist.hosted_zone_id
    evaluate_target_health = false
  }
}
