terraform {
  # Solo el backend aquí
  backend "s3" {
    bucket  = "mozart-tfstate-na-2025"  # tu bucket
    key     = "cemdi/terraform.tfstate" # tu key
    region  = "us-east-1"
    profile = "mozart-cemdi" # si usas perfil local
    encrypt = true
  }
}

# Provider único aquí
provider "aws" {
  region  = var.aws_region # o "us-east-1" si prefieres fijo
  profile = "mozart-cemdi" # quítalo si no usas perfiles
}
