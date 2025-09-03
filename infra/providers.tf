terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket  = "mozart-tfstate-na-2025" # tu bucket
    key     = "cemdi/terraform.tfstate"
    region  = "us-east-1"
    profile = "mozart-cemdi" # <- importante
    encrypt = true
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "mozart-cemdi"
}
