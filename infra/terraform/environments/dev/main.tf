terraform {
  required_version = ">= 1.5.0"
}

module "app" {
  source      = "../../modules/app"
  project     = "nutihealth"
  environment = "dev"
}

output "deployment_name" {
  value = module.app.deployment_name
}
