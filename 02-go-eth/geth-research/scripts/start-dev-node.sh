#!/bin/bash

# Geth开发节点启动脚本
# 用途: 快速启动本地开发测试环境

echo "==================================="
echo "启动Geth开发节点"
echo "==================================="

# 数据目录
DATA_DIR="$(pwd)/practical/dev-node"

# 创建数据目录
mkdir -p "$DATA_DIR"

echo "数据目录: $DATA_DIR"
echo "HTTP-RPC: http://localhost:8545"
echo "WebSocket: ws://localhost:8546"
echo ""
echo "启动中..."

# 启动geth开发节点
geth --datadir "$DATA_DIR" \
     --dev \
     --http \
     --http.addr 0.0.0.0 \
     --http.port 8545 \
     --http.api "eth,net,web3,personal,admin,miner,debug,txpool" \
     --http.corsdomain "*" \
     --ws \
     --ws.addr 0.0.0.0 \
     --ws.port 8546 \
     --ws.api "eth,net,web3" \
     --ws.origins "*" \
     --allow-insecure-unlock \
     --dev.period 0 \
     --verbosity 3 \
     console

# 说明:
# --dev: 开发模式，自动创建测试账户
# --http: 启用HTTP-RPC服务器
# --http.api: 暴露的API模块
# --ws: 启用WebSocket服务器
# --allow-insecure-unlock: 允许HTTP解锁账户（仅开发使用）
# --dev.period: 出块间隔（0=仅在有交易时出块）
# console: 启动交互式控制台
