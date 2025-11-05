# Go-Ethereum 研究项目使用指南

## 快速导航

本文档提供详细的操作步骤，帮助你快速上手并完成所有实践验证。

---

## 目录

1. [环境准备](#环境准备)
2. [开发节点实践](#开发节点实践)
3. [私有链实践](#私有链实践)
4. [智能合约实践](#智能合约实践)
5. [性能测试](#性能测试)
6. [故障排查](#故障排查)

---

## 环境准备

### 1. 检查系统要求

```bash
# 检查系统信息
uname -a

# 检查可用内存
free -h

# 检查磁盘空间
df -h
```

**最低要求**:
- 内存: 8GB
- 磁盘: 10GB可用空间
- CPU: 2核心

### 2. 安装Geth

#### 方法A: 从PPA安装（Ubuntu/Debian推荐）

```bash
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install ethereum

# 验证安装
geth version
```

#### 方法B: 从源码编译

```bash
# 安装Go（如果未安装）
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# 克隆Geth仓库
git clone https://github.com/ethereum/go-ethereum.git
cd go-ethereum

# 编译
make geth

# 添加到PATH
export PATH=$PATH:$(pwd)/build/bin
echo 'export PATH=$PATH:'$(pwd)'/build/bin' >> ~/.bashrc

# 验证
geth version
```

### 3. 安装Node.js依赖

```bash
# 进入scripts目录
cd geth-research/scripts

# 安装npm包
npm install

# 验证web3
node -e "console.log(require('web3').version)"
```

---

## 开发节点实践

开发模式是最快速的测试方式，适合智能合约开发。

### 步骤1: 启动开发节点

```bash
cd geth-research

# 启动节点（会自动打开控制台）
./scripts/start-dev-node.sh
```

**预期输出**:
```
===================================
启动Geth开发节点
===================================
数据目录: /path/to/geth-research/practical/dev-node
HTTP-RPC: http://localhost:8545
WebSocket: ws://localhost:8546

启动中...
INFO [11-02|12:00:00.000] Starting Geth in dev mode...
Welcome to the Geth JavaScript console!
>
```

### 步骤2: 基础验证

在Geth控制台中执行：

```javascript
// 1. 查看账户（dev模式自动创建）
eth.accounts
// 输出: ["0x<dev-account>"]

// 2. 查看余额（预分配大量ETH）
web3.fromWei(eth.getBalance(eth.accounts[0]), "ether")
// 输出: 非常大的数字

// 3. 查看区块高度
eth.blockNumber
// 输出: 0（初始）

// 4. 查看链ID
eth.chainId()
// 输出: 1337

// 5. 查看节点信息
admin.nodeInfo.name
// 输出: "Geth/v1.13.x..."
```

### 步骤3: 发送交易

```javascript
// 创建第二个账户
var acc2 = personal.newAccount("password123")
// 输出: "0x<new-address>"

// 查看所有账户
eth.accounts
// 输出: ["0x<acc1>", "0x<acc2>"]

// 发送交易
eth.sendTransaction({
    from: eth.accounts[0],
    to: eth.accounts[1],
    value: web3.toWei(10, "ether")
})
// 输出: "0x<tx-hash>"

// 查看区块（自动产生）
eth.blockNumber
// 输出: 1

// 查看交易详情
eth.getTransaction("0x<tx-hash>")

// 查看交易收据
eth.getTransactionReceipt("0x<tx-hash>")

// 验证余额
web3.fromWei(eth.getBalance(eth.accounts[1]), "ether")
// 输出: 10
```

### 步骤4: 探索更多功能

```javascript
// 查看交易池
txpool.status
// 输出: {pending: 0, queued: 0}

// 查看Gas价格
eth.gasPrice
// 输出: 1000000000 (1 Gwei)

// 查看最新区块
eth.getBlock("latest")

// 查看账户交易数（nonce）
eth.getTransactionCount(eth.accounts[0])
```

### 步骤5: 退出

```javascript
// 在控制台中
exit

// 或按 Ctrl+D
```

---

## 私有链实践

搭建自己的以太坊私有网络，使用Clique PoA共识。

### 步骤1: 初始化私有链

```bash
cd geth-research

# 运行初始化脚本
./scripts/init-private-chain.sh
```

**预期输出**:
```
===================================
初始化私有以太坊链
===================================

创建节点1的签名者账户...
Your new key was generated
Public address of the key:   0x<address>
Path of the secret key file: ...
签名者地址: 0x<address>

生成genesis.json...
Genesis文件已创建: .../genesis.json

初始化节点1...
INFO [11-02|12:00:00.000] Successfully wrote genesis state

===================================
初始化完成！
===================================
数据目录: .../node1
签名者地址: 0x<address>
初始余额: 1000 ETH

使用以下命令启动节点:
./scripts/start-node1.sh
```

### 步骤2: 启动节点1

```bash
./scripts/start-node1.sh
```

**预期输出**:
```
===================================
启动私有链节点1
===================================
节点目录: .../node1
签名者地址: 0x<address>
HTTP-RPC: http://localhost:8545
WebSocket: ws://localhost:8546
P2P端口: 30303

启动中...
INFO [11-02|12:00:00.000] Starting Geth on private network...
Welcome to the Geth JavaScript console!
>
```

### 步骤3: 验证Clique共识

```javascript
// 1. 查看签名者列表
clique.getSigners()
// 输出: ["0x<signer-address>"]

// 2. 查看快照
clique.getSnapshot()
// 输出: {hash: "0x...", number: 0, signers: {...}, ...}

// 3. 验证挖矿状态
eth.mining
// 输出: true

// 4. 查看矿工地址
eth.coinbase
// 输出: "0x<signer-address>"

// 5. 等待出块
eth.blockNumber
// 每5秒增加1（genesis.json中配置的period）
```

### 步骤4: 添加第二个签名者（可选）

在节点1控制台中：

```javascript
// 提议添加新签名者
clique.propose("0x<new-signer-address>", true)
// true = 添加, false = 移除

// 查看待处理提议
clique.proposals
// 输出: {"0x<new-signer-address>": true}
```

### 步骤5: 连接第二个节点（可选）

在新终端中：

```bash
cd geth-research/practical/private-chain

# 创建节点2目录
mkdir node2

# 初始化节点2
geth --datadir ./node2 init genesis.json

# 启动节点2
geth --datadir ./node2 \
     --networkid 12345 \
     --port 30304 \
     --http \
     --http.port 8547 \
     console
```

在节点1控制台获取enode：

```javascript
admin.nodeInfo.enode
// 复制输出: "enode://<node1-id>@127.0.0.1:30303"
```

在节点2控制台添加peer：

```javascript
admin.addPeer("enode://<node1-id>@127.0.0.1:30303")
// 输出: true

// 验证连接
admin.peers.length
// 输出: 1

// 验证同步
eth.syncing
// 输出: false (已同步) 或 {...} (同步中)

// 验证区块高度
eth.blockNumber
// 应与节点1一致
```

---

## 智能合约实践

部署和交互SimpleStorage合约。

### 步骤1: 查看合约代码

```bash
cat practical/SimpleStorage.sol
```

### 步骤2: 确保节点运行

```bash
# 检查节点是否运行
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545

# 预期输出: {"jsonrpc":"2.0","id":1,"result":"0x<block-number>"}
```

### 步骤3: 部署合约

```bash
cd geth-research/scripts

# 部署合约
node deploy-contract.js
```

**预期输出**:
```
===================================
智能合约部署脚本
===================================
RPC URL: http://localhost:8545

部署账户: 0x...
账户余额: 1000 ETH

估算部署Gas...
估算Gas: 293827

部署合约中...

✓ 合约部署成功！
合约地址: 0x<contract-address>
地址已保存到: .../contract-address.txt

验证合约...
初始存储值: 0

测试写入数据...
新存储值: 42

测试increment...
递增后的值: 43

===================================
✓ 所有测试通过！
===================================
```

### 步骤4: 使用Geth控制台交互

```javascript
// 读取合约地址
var contractAddr = "<从practical/contract-address.txt读取>"

// 定义ABI
var abi = [
    {
        "inputs": [],
        "name": "get",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "x", "type": "uint256"}],
        "name": "set",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

// 创建合约实例
var contract = eth.contract(abi).at(contractAddr)

// 读取数据
contract.get.call()
// 输出: 43

// 写入数据
contract.set(100, {from: eth.accounts[0], gas: 100000})
// 输出: "0x<tx-hash>"

// 再次读取
contract.get.call()
// 输出: 100
```

### 步骤5: 监听事件

```javascript
// 定义完整ABI（包含事件）
var fullAbi = [
    /* ... 包含DataStored事件 ... */
]

var contract = eth.contract(fullAbi).at(contractAddr)

// 创建过滤器监听事件
var filter = contract.DataStored({}, {fromBlock: 0})

// 查看历史事件
filter.get(function(error, result) {
    if (!error) {
        console.log("Events:", result)
    }
})

// 监听新事件
filter.watch(function(error, result) {
    if (!error) {
        console.log("New event:", result.args)
    }
})

// 停止监听
filter.stopWatching()
```

---

## 性能测试

测试节点的交易处理能力。

### 步骤1: 运行压力测试

```bash
cd geth-research/scripts

# 默认100笔交易
node stress-test.js

# 自定义交易数量
NUM_TXS=500 node stress-test.js

# 自定义批次大小
NUM_TXS=1000 BATCH_SIZE=50 node stress-test.js
```

**预期输出**:
```
===================================
Geth 压力测试
===================================
RPC URL: http://localhost:8545
交易数量: 100
批次大小: 10

发送者: 0x...
接收者: 0x...
发送者余额: 1000 ETH

初始nonce: 0

开始发送交易...
批次 1/10 完成 (10/100 交易)
批次 2/10 完成 (20/100 交易)
...
批次 10/10 完成 (100/100 交易)

===================================
测试结果
===================================
总交易数: 100
总耗时: 5.23 秒
平均TPS: 19.12
平均延迟: 52.30 ms

验证交易状态...
成功: 100
失败: 0

最终余额:
发送者: 999.88 ETH
接收者: 0.1 ETH

总Gas成本: 0.0021 ETH
平均Gas成本: 0.000021 ETH

✓ 测试完成！
```

### 步骤2: 分析结果

**性能指标解读**:

- **TPS (Transactions Per Second)**:
  - Dev模式: 通常100-500 TPS
  - Private Clique: 50-200 TPS
  - 主网: 约15 TPS

- **延迟 (Latency)**:
  - Dev模式: <100ms
  - Private Clique: <500ms
  - 主网: 10-30秒

- **Gas成本**:
  - 简单转账: 21000 Gas
  - 合约调用: 通常50000-500000 Gas

### 步骤3: 性能优化建议

```bash
# 增加缓存（提高读性能）
geth --cache 4096 ...

# 增加Gas限制（提高吞吐）
# 修改genesis.json中的gasLimit

# 减少出块时间（私有链）
# 修改genesis.json中的clique.period

# 使用SSD存储（提高I/O）
```

---

## 故障排查

### 问题1: 端口已被占用

**错误**:
```
Fatal: Error starting protocol stack: listen tcp :8545: bind: address already in use
```

**解决**:
```bash
# 查找占用进程
lsof -i :8545

# 或
netstat -nlp | grep 8545

# 终止进程
kill -9 <PID>

# 或更换端口
geth --http.port 8546 ...
```

### 问题2: 账户被锁定

**错误**:
```
Error: authentication needed: password or unlock
```

**解决**:
```javascript
// 在Geth控制台中解锁
personal.unlockAccount(eth.accounts[0], "password", 0)
// 0表示永久解锁（仅开发环境！）

// 或启动时解锁
geth --unlock "0x<address>" --password <(echo "password") ...
```

### 问题3: Gas不足

**错误**:
```
Error: insufficient funds for gas * price + value
```

**解决**:
```javascript
// 检查账户余额
eth.getBalance(eth.accounts[0])

// Dev模式：切换到预分配账户
// 私有链：从签名者账户转账
eth.sendTransaction({
    from: eth.accounts[0],  // 有余额的账户
    to: eth.accounts[1],
    value: web3.toWei(100, "ether")
})
```

### 问题4: 合约部署失败

**错误**:
```
Error: Transaction ran out of gas
```

**解决**:
```javascript
// 增加Gas限制
contract.new({
    from: eth.accounts[0],
    data: bytecode,
    gas: 5000000  // 增加Gas
})

// 或估算Gas
eth.estimateGas({
    from: eth.accounts[0],
    data: bytecode
})
```

### 问题5: 节点无法启动

**错误**:
```
Fatal: Failed to register the Ethereum service: database contains incompatible genesis
```

**解决**:
```bash
# 删除旧数据重新初始化
rm -rf ./practical/private-chain/node1/geth
geth --datadir ./practical/private-chain/node1 init genesis.json
```

### 问题6: 交易pending很久

**检查**:
```javascript
// 查看pending交易
txpool.content.pending

// 查看交易状态
eth.getTransaction("0x<tx-hash>")

// 检查nonce是否正确
eth.getTransactionCount(eth.accounts[0])
```

**解决**:
```javascript
// 如果nonce有空隙，发送填充交易
eth.sendTransaction({
    from: eth.accounts[0],
    to: eth.accounts[0],
    value: 0,
    nonce: <missing-nonce>
})

// 或增加Gas价格加速
eth.sendTransaction({
    from: eth.accounts[0],
    to: "0x...",
    value: web3.toWei(1, "ether"),
    gasPrice: eth.gasPrice * 2  // 双倍Gas价格
})
```

---

## 日志查看

### 启动时启用详细日志

```bash
geth --verbosity 4 ... 2>&1 | tee geth.log
```

**日志级别**:
- 0: Silent
- 1: Error
- 2: Warn
- 3: Info (默认)
- 4: Debug
- 5: Trace

### 查看特定模块日志

```bash
# 只显示miner和txpool的debug日志
geth --vmodule "miner=5,txpool=4" ...
```

### 实时监控日志

```bash
# 另一终端
tail -f geth.log | grep -E 'Imported|mined|error'
```

---

## 数据管理

### 查看数据目录大小

```bash
du -sh practical/dev-node
du -sh practical/private-chain/node1
```

### 清理数据

```bash
# 删除dev节点数据
rm -rf practical/dev-node

# 删除私有链数据
rm -rf practical/private-chain
```

### 备份数据

```bash
# 停止节点后备份
tar -czf geth-backup-$(date +%Y%m%d).tar.gz practical/private-chain/node1
```

---

## 进阶使用

### 使用Web3.js脚本

创建 `custom-script.js`:

```javascript
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

async function main() {
    // 获取账户
    const accounts = await web3.eth.getAccounts();
    console.log('Accounts:', accounts);

    // 查询余额
    const balance = await web3.eth.getBalance(accounts[0]);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');

    // 发送交易
    const receipt = await web3.eth.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei('1', 'ether')
    });
    console.log('Transaction hash:', receipt.transactionHash);
}

main().catch(console.error);
```

运行:
```bash
node custom-script.js
```

### 使用curl调用JSON-RPC

```bash
# 查询区块号
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545

# 查询账户余额
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x<address>","latest"],"id":1}' \
     http://localhost:8545

# 发送交易
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_sendTransaction","params":[{"from":"0x...","to":"0x...","value":"0x1"}],"id":1}' \
     http://localhost:8545
```

---

## 完成检查清单

验证所有功能是否正常工作：

- [ ] 成功安装Geth
- [ ] 启动开发节点
- [ ] 在控制台执行基本命令
- [ ] 发送交易并确认
- [ ] 初始化私有链
- [ ] 启动私有链节点
- [ ] 验证Clique共识
- [ ] 部署智能合约
- [ ] 调用合约方法
- [ ] 监听合约事件
- [ ] 运行压力测试
- [ ] 分析性能数据

---

## 下一步学习

完成本指南后，推荐继续学习：

1. **深入源码**: 阅读 `core/`, `eth/`, `vm/` 模块
2. **EIP提案**: 理解以太坊改进提案
3. **Layer2**: 学习Rollup、State Channel等扩容方案
4. **DeFi协议**: 研究Uniswap、Aave等智能合约
5. **安全审计**: 学习智能合约安全最佳实践

---

## 获取帮助

遇到问题？尝试以下途径：

1. 查看官方文档: https://geth.ethereum.org/docs
2. GitHub Issues: https://github.com/ethereum/go-ethereum/issues
3. Ethereum Stack Exchange: https://ethereum.stackexchange.com/
4. Discord: Ethereum R&D 服务器

---

**祝你学习愉快！** 🚀
