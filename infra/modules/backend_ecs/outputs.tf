output "alb_dns" { value = aws_lb.alb.dns_name }
output "alb_zone_id" { value = aws_lb.alb.zone_id }
output "cluster_name" { value = aws_ecs_cluster.cluster.name }
output "service_name" { value = aws_ecs_service.svc.name }
