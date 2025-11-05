#!/bin/bash

# 私有链初始化脚本
# 用途: 创建私有以太坊网络

set -e

echo "==================================="
echo "初始化私有以太坊链"
echo "==================================="

PRIVATE_DIR="$(pwd)/practical/private-chain"
NODE1_DIR="$PRIVATE_DIR/node1"
GENESIS_FILE="$PRIVATE_DIR/genesis.json"

# 创建目录
mkdir -p "$PRIVATE_DIR"

# 创建第一个账户
echo ""
echo "创建节点1的签名者账户..."
ACCOUNT_OUTPUT=$(geth --datadir "$NODE1_DIR" account new --password <(echo "node1password"))
SIGNER_ADDRESS=$(echo "$ACCOUNT_OUTPUT" | grep -oP '(?<=Public address of the key:   )[0-9a-fA-Fx]+' | sed 's/0x//')

if [ -z "$SIGNER_ADDRESS" ]; then
    echo "错误: 无法提取账户地址"
    echo "输出: $ACCOUNT_OUTPUT"
    exit 1
fi

echo "签名者地址: 0x$SIGNER_ADDRESS"

# 创建genesis.json
echo ""
echo "生成genesis.json..."

# 构建extradata (32字节前缀 + 20字节地址 + 65字节后缀)
EXTRADATA_PREFIX="0000000000000000000000000000000000000000000000000000000000000000"
EXTRADATA_SUFFIX="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
EXTRADATA="0x${EXTRADATA_PREFIX}${SIGNER_ADDRESS}${EXTRADATA_SUFFIX}"

cat > "$GENESIS_FILE" <<EOF
{
  "config": {
    "chainId": 12345,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "8000000",
  "extradata": "$EXTRADATA",
  "alloc": {
    "0x${SIGNER_ADDRESS}": {
      "balance": "1000000000000000000000"
    }
  }
}
EOF

echo "Genesis文件已创建: $GENESIS_FILE"

# 初始化节点
echo ""
echo "初始化节点1..."
geth --datadir "$NODE1_DIR" init "$GENESIS_FILE"

echo ""
echo "==================================="
echo "初始化完成！"
echo "==================================="
echo "数据目录: $NODE1_DIR"
echo "签名者地址: 0x$SIGNER_ADDRESS"
echo "初始余额: 1000 ETH"
echo ""
echo "使用以下命令启动节点:"
echo "./scripts/start-node1.sh"
