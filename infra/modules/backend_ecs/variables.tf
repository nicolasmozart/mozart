variable "aws_region"        { type = string }
variable "name_prefix"       { type = string }
variable "ecr_repo_url"      { type = string }
variable "image_tag"         { type = string }
variable "container_port"    { type = number }
variable "health_check_path" { type = string }
variable "desired_count"     { type = number }
