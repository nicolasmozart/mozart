output "alb_dns"      { value = aws_lb.alb.dns_name }
output "cluster_name" { value = aws_ecs_cluster.cluster.name }
output "service_name" { value = aws_ecs_service.svc.name }
