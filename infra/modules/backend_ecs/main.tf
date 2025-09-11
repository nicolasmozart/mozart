########################################
# Red y ALB
########################################

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "alb_sg" {
  name   = "${var.name_prefix}-alb-sg"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "alb" {
  name               = "${var.name_prefix}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_target_group" "tg" {
  name        = "${substr(var.name_prefix, 0, 20)}-tg-${var.container_port}"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    path    = var.health_check_path
    matcher = "200-399"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Listener HTTP :80
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

# Listener HTTPS :443
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

########################################
# Roles y Logs
########################################

data "aws_iam_policy_document" "task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "exec" {
  name               = "${var.name_prefix}-exec"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json
}

resource "aws_iam_role_policy_attachment" "exec_managed" {
  role       = aws_iam_role.exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-task"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json
}

resource "aws_cloudwatch_log_group" "lg" {
  name              = "/ecs/${var.name_prefix}"
  retention_in_days = 14
}

########################################
# Permisos para leer secretos (solo si hay)
########################################

locals {
  secrets_arns = compact([
    var.mongodb_uri_secret_arn,
    var.jwt_secret_arn,
  ])

  container_env = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = tostring(var.container_port) },
  ]

  container_secrets = concat(
    var.mongodb_uri_secret_arn != null ? [
      { name = "MONGODB_URI", valueFrom = var.mongodb_uri_secret_arn }
    ] : [],
    var.jwt_secret_arn != null ? [
      { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn }
    ] : []
  )
}

# ➜ Policy para que la TASK lea secretos (para uso en runtime con SDK, etc.)
data "aws_iam_policy_document" "task_secrets_access" {
  count = var.secrets_enabled ? 1 : 0

  statement {
    sid       = "AllowSecretsManager"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = local.secrets_arns
  }
}

resource "aws_iam_policy" "task_secrets_access" {
  count  = var.secrets_enabled ? 1 : 0
  name   = "${var.name_prefix}-task-secrets-access"
  policy = data.aws_iam_policy_document.task_secrets_access[0].json
}

resource "aws_iam_role_policy_attachment" "task_secrets_attach" {
  count      = var.secrets_enabled ? 1 : 0
  role       = aws_iam_role.task.name
  policy_arn = aws_iam_policy.task_secrets_access[0].arn
}

# ➜ Policy para que el EXECUTION ROLE también pueda obtener secretos
#    (necesario para inyectar 'secrets' del contenedor al iniciar la task)
data "aws_iam_policy_document" "exec_secrets_access" {
  count = var.secrets_enabled ? 1 : 0

  statement {
    sid       = "AllowSecretsManagerForExecRole"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = local.secrets_arns
  }
}

resource "aws_iam_policy" "exec_secrets_access" {
  count  = var.secrets_enabled ? 1 : 0
  name   = "${var.name_prefix}-exec-secrets-access"
  policy = data.aws_iam_policy_document.exec_secrets_access[0].json
}

resource "aws_iam_role_policy_attachment" "exec_secrets_attach" {
  count      = var.secrets_enabled ? 1 : 0
  role       = aws_iam_role.exec.name
  policy_arn = aws_iam_policy.exec_secrets_access[0].arn
}

########################################
# ECS Cluster + Task Definition + Service
########################################

resource "aws_ecs_cluster" "cluster" {
  name = "${var.name_prefix}-cluster"
}

resource "aws_ecs_task_definition" "td" {
  family                   = "${var.name_prefix}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.exec.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repo_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = var.container_port
        hostPort      = var.container_port
        protocol      = "tcp"
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.lg.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      environment = local.container_env
      secrets     = local.container_secrets

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:${var.container_port}${var.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }
    }
  ])
}

resource "aws_security_group" "svc_sg" {
  name   = "${var.name_prefix}-svc-sg"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_ecs_service" "svc" {
  name            = "${var.name_prefix}-svc"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.td.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.svc_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tg.arn
    container_name   = "app"
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
}
