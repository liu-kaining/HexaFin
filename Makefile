.PHONY: help up divine run build

help:
	@echo "HexaFin 本地 Docker 命令："
	@echo "  make build   - 构建 engine 镜像"
	@echo "  make divine  - 运行引擎，生成 public/daily_result.json"
	@echo "  make up      - 启动前端（http://localhost:8080）"
	@echo "  make run     - 先生成数据，再启动前端"

build:
	docker compose --profile engine build engine

divine:
	docker compose --profile engine run --rm engine

up:
	docker compose up web

run: divine up
