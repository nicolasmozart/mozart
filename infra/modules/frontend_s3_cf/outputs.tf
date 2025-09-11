output "bucket_name" { value = aws_s3_bucket.front.bucket }
output "distribution_id" { value = aws_cloudfront_distribution.dist.id }
output "cf_domain" { value = aws_cloudfront_distribution.dist.domain_name }
