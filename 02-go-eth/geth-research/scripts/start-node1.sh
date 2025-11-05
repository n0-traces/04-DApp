#!/bin/bash

# 启动私有链节点1
# 用途: 作为Clique签名者的主节点

set -e

echo "==================================="
echo "启动私有链节点1"
echo "==================================="

PRIVATE_DIR="$(pwd)/practical/private-chain"
NODE1_DIR="$PRIVATE_DIR/node1"
PASSWORD_FILE="$PRIVATE_DIR/password.txt"

# 检查节点是否已初始化
if [ ! -d "$NODE1_DIR/geth" ]; then
    echo "错误: 节点未初始化，请先运行 ./scripts/init-private-chain.sh"
    exit 1
fi

# 创建密码文件
echo "node1password" > "$PASSWORD_FILE"

# 获取签名者地址
KEYSTORE_FILE=$(ls "$NODE1_DIR/keystore" | head -1)
if [ -z "$KEYSTORE_FILE" ]; then
    echo "错误: 未找到keystore文件"
    exit 1
fi

SIGNER_ADDRESS=$(cat "$NODE1_DIR/keystore/$KEYSTORE_FILE" | grep -oP '(?<="address":")[0-9a-f]+')

echo "节点目录: $NODE1_DIR"
echo "签名者地址: 0x$SIGNER_ADDRESS"
echo "HTTP-RPC: http://localhost:8545"
echo "WebSocket: ws://localhost:8546"
echo "P2P端口: 30303"
echo ""
echo "启动中..."

# 启动节点
geth --datadir "$NODE1_DIR" \
     --networkid 12345 \
     --http \
     --http.addr 0.0.0.0 \
     --http.port 8545 \
     --http.api "eth,net,web3,personal,admin,miner,clique,debug,txpool" \
     --http.corsdomain "*" \
     --ws \
     --ws.addr 0.0.0.0 \
     --ws.port 8546 \
     --ws.api "eth,net,web3" \
     --ws.origins "*" \
     --port 30303 \
     --allow-insecure-unlock \
     --unlock "0x$SIGNER_ADDRESS" \
     --password "$PASSWORD_FILE" \
     --mine \
     --miner.etherbase "0x$SIGNER_ADDRESS" \
     --miner.gasprice 1000000000 \
     --verbosity 3 \
     console

# 清理密码文件
rm -f "$PASSWORD_FILE"
