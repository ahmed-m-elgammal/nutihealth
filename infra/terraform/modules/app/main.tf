variable "project" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

output "deployment_name" {
  value       = "${var.project}-${var.environment}"
  description = "Canonical deployment identifier"
}
