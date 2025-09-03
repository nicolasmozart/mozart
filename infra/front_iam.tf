data "aws_iam_policy_document" "gha_front" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${module.frontend.bucket_name}"]
  }
  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:PutObjectAcl"]
    resources = ["arn:aws:s3:::${module.frontend.bucket_name}/*"]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = ["*"] # suficiente para despliegue
  }
}

resource "aws_iam_policy" "gha_front" {
  name   = "${var.name_prefix}-gha-front"
  policy = data.aws_iam_policy_document.gha_front.json
}

# Adjuntar a TU rol OIDC existente:
resource "aws_iam_role_policy_attachment" "gha_front_attach" {
  role       = "${var.name_prefix}-gha-role"
  policy_arn = aws_iam_policy.gha_front.arn
}
