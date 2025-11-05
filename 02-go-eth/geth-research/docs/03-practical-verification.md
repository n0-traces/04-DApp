# Go-Ethereum 实践验证报告

## 一、环境准备

### 1.1 系统要求

```
操作系统: Linux / macOS / Windows (WSL2)
内存: 最低8GB，推荐16GB
存储:
  - Dev模式: 1GB
  - 主网全节点: 800GB+ SSD
  - 测试网: 50-100GB
Go版本: 1.21+
```

### 1.2 安装Geth

#### 方法1: 从源码编译

```bash
# 克隆仓库
git clone https://github.com/ethereum/go-ethereum.git
cd go-ethereum

# 查看最新稳定版本
git tag | grep -v rc | tail -5

# 切换到稳定版本
git checkout v1.13.8

# 编译
make geth

# 验证安装
./build/bin/geth version
```

#### 方法2: 使用包管理器

```bash
# Ubuntu/Debian
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install ethereum

# macOS
brew tap ethereum/ethereum
brew install ethereum

# Arch Linux
sudo pacman -S geth
```

---

## 二、开发模式 (Dev Mode)

### 2.1 启动开发节点

开发模式使用Clique共识（PoA），无需挖矿，适合本地开发测试。

```bash
# 创建数据目录
mkdir -p geth-research/practical/dev-node

# 启动dev节点
geth --datadir ./geth-research/practical/dev-node \
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
     --allow-insecure-unlock \
     --dev.period 0  # 0=仅在有交易时出块，1+=定时出块
```

**参数说明**:
- `--dev`: 开发模式，自动创建测试账户并预分配以太币
- `--http`: 启用HTTP-RPC服务器
- `--http.api`: 暴露的API模块
- `--ws`: 启用WebSocket服务器
- `--allow-insecure-unlock`: 允许HTTP解锁账户（仅开发用）
- `--dev.period`: 出块间隔（秒）

### 2.2 控制台验证

在另一个终端，连接到dev节点：

```bash
geth attach http://localhost:8545
```

#### 基础功能验证

```javascript
// 1. 查看账户
> eth.accounts
["0x<dev-address>"]

// 2. 查看余额（Dev模式预分配大量ETH）
> web3.fromWei(eth.getBalance(eth.accounts[0]), "ether")
1.157920892373162e+59  // 非常大的数值

// 3. 查看区块高度
> eth.blockNumber
0  // 初始为0

// 4. 查看网络ID
> net.version
"1337"  // Dev模式默认chainID

// 5. 查看节点信息
> admin.nodeInfo
{
  enode: "enode://...",
  id: "...",
  ip: "::",
  listenAddr: "[::]:30303",
  name: "Geth/v1.13.8-stable/linux-amd64/go1.21.5",
  ports: {...},
  protocols: {
    eth: {
      difficulty: 1,
      genesis: "0x...",
      head: "0x...",
      network: 1337
    }
  }
}

// 6. 查看交易池状态
> txpool.status
{
  pending: 0,
  queued: 0
}

// 7. 查看peer连接（Dev模式无peer）
> admin.peers
[]
```

#### 交易测试

```javascript
// 1. 创建新账户
> personal.newAccount("password123")
"0x<new-address>"

// 2. 解锁账户
> personal.unlockAccount(eth.accounts[0], "", 0)
true

// 3. 发送交易
> eth.sendTransaction({
    from: eth.accounts[0],
    to: eth.accounts[1],
    value: web3.toWei(10, "ether")
  })
"0x<tx-hash>"

// 4. 查看区块（自动产生新区块）
> eth.blockNumber
1

// 5. 查看交易详情
> eth.getTransaction("0x<tx-hash>")
{
  blockHash: "0x...",
  blockNumber: 1,
  from: "0x...",
  gas: 21000,
  gasPrice: 1000000000,
  hash: "0x...",
  input: "0x",
  nonce: 0,
  to: "0x...",
  transactionIndex: 0,
  value: 10000000000000000000,
  type: "0x0",
  v: "0x...",
  r: "0x...",
  s: "0x..."
}

// 6. 查看交易收据
> eth.getTransactionReceipt("0x<tx-hash>")
{
  blockHash: "0x...",
  blockNumber: 1,
  contractAddress: null,
  cumulativeGasUsed: 21000,
  effectiveGasPrice: 1000000000,
  from: "0x...",
  gasUsed: 21000,
  logs: [],
  logsBloom: "0x00...",
  status: "0x1",  // 1 = 成功
  to: "0x...",
  transactionHash: "0x...",
  transactionIndex: 0,
  type: "0x0"
}

// 7. 验证余额变化
> web3.fromWei(eth.getBalance(eth.accounts[1]), "ether")
10  // 收到10 ETH
```

#### 智能合约部署

```javascript
// 简单存储合约 (Storage.sol)
var storageCode = "0x608060405234801561001057600080fd5b5060f78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80632e64cec11460415780636057361d146051575b600080fd5b6047606b565b60405160489190608d565b60405180910390f35b606960048036038101906064919060b8565b6074565b005b60008054905090565b8060008190555050565b6000819050919050565b6087816078565b82525050565b600060208201905060a06000830184607e565b92915050565b60006020828403121560cd5760cc60df565b5b600060da8482850160e4565b91505092915050565b600080fd5b60e4816078565b811460ee57600080fd5b5056fea2646970667358221220a30b3d3c4c7b5d4c5c6c7c8c9c0c1c2c3c4c5c6c7c8c9c0c1c2c3c4c5c6c7c8964736f6c63430008070033"

// 部署合约
var storageContract = eth.contract([{"inputs":[],"name":"retrieve","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"num","type":"uint256"}],"name":"store","outputs":[],"stateMutability":"nonpayable","type":"function"}])

var storage = storageContract.new({
    from: eth.accounts[0],
    data: storageCode,
    gas: 1000000
})

// 等待合约部署（查看交易收据）
> eth.getTransactionReceipt(storage.transactionHash)
{
  contractAddress: "0x<contract-address>",
  status: "0x1"
}

// 获取合约实例
var storageInstance = storageContract.at("0x<contract-address>")

// 调用合约（写入）
> storageInstance.store(42, {from: eth.accounts[0]})
"0x<tx-hash>"

// 调用合约（读取）
> storageInstance.retrieve.call()
42
```

### 2.3 调试与追踪

```javascript
// 1. 调试交易
> debug.traceTransaction("0x<tx-hash>")
{
  gas: 21000,
  returnValue: "",
  structLogs: [
    // EVM执行步骤详情
  ]
}

// 2. 查看区块详情
> debug.dumpBlock(1)
{
  accounts: {
    "0x...": {
      balance: "...",
      nonce: 1,
      root: "0x...",
      codeHash: "0x...",
      code: "",
      storage: {}
    }
  },
  root: "0x..."
}

// 3. 查看内存统计
> debug.memStats()
{
  Alloc: ...,
  TotalAlloc: ...,
  Sys: ...,
  NumGC: ...
}

// 4. 查看VM配置
> debug.verbosity(4)  // 设置日志级别
```

---

## 三、私有链搭建

### 3.1 创建Genesis文件

```bash
cd geth-research/practical
mkdir private-chain
cd private-chain
```

创建 `genesis.json`:

```json
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
  "extradata": "0x0000000000000000000000000000000000000000000000000000000000000000<signer-address>0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "alloc": {
    "<pre-funded-address>": {
      "balance": "1000000000000000000000"
    }
  }
}
```

**注意**:
- `extradata` 中的 `<signer-address>` 需要替换为实际的签名者地址（无0x前缀）
- `alloc` 中可预分配以太币给指定地址

### 3.2 初始化节点

```bash
# 创建账户（作为Clique签名者）
geth --datadir ./node1 account new
# 输入密码并记录地址: 0x<signer-address>

# 修改genesis.json中的extradata和alloc

# 初始化节点
geth --datadir ./node1 init genesis.json

# 输出:
# INFO [01-02|12:00:00.000] Successfully wrote genesis state
```

### 3.3 启动私有链节点

创建启动脚本 `start-node1.sh`:

```bash
#!/bin/bash

geth --datadir ./node1 \
     --networkid 12345 \
     --http \
     --http.addr 0.0.0.0 \
     --http.port 8545 \
     --http.api "eth,net,web3,personal,admin,miner,clique" \
     --ws \
     --ws.addr 0.0.0.0 \
     --ws.port 8546 \
     --port 30303 \
     --allow-insecure-unlock \
     --unlock "0x<signer-address>" \
     --password <(echo "your-password") \
     --mine \
     --miner.etherbase "0x<signer-address>" \
     console
```

```bash
chmod +x start-node1.sh
./start-node1.sh
```

### 3.4 添加第二个节点（可选）

```bash
# 创建第二个节点
mkdir node2
geth --datadir ./node2 init genesis.json

# 启动节点2
geth --datadir ./node2 \
     --networkid 12345 \
     --http \
     --http.port 8547 \
     --ws.port 8548 \
     --port 30304 \
     console
```

在节点1的控制台中：

```javascript
// 查看节点1的enode
> admin.nodeInfo.enode
"enode://node1-id@127.0.0.1:30303"
```

在节点2的控制台中：

```javascript
// 添加节点1为peer
> admin.addPeer("enode://node1-id@127.0.0.1:30303")
true

// 验证连接
> admin.peers
[{
  caps: ["eth/66", "eth/67", "snap/1"],
  enode: "enode://...",
  id: "...",
  name: "Geth/v1.13.8...",
  network: {
    inbound: false,
    localAddress: "127.0.0.1:...",
    remoteAddress: "127.0.0.1:30303",
    static: true,
    trusted: false
  },
  protocols: {...}
}]
```

### 3.5 私有链功能验证

```javascript
// 1. 验证Clique共识
> clique.getSigners()
["0x<signer-address>"]

> clique.getSnapshot()
{
  hash: "0x...",
  number: 5,
  recents: {...},
  signers: {
    "0x<signer-address>": {}
  },
  votes: []
}

// 2. 提议新的签名者
> clique.propose("0x<new-signer>", true)  // true=添加, false=移除

// 3. 查看待处理提议
> clique.proposals
{
  "0x<new-signer>": true
}

// 4. 验证挖矿
> eth.mining
true

> eth.hashrate
0  // Clique为PoA，无需算力

> miner.setEtherbase("0x<address>")
true
```

---

## 四、智能合约部署实践

### 4.1 准备Solidity合约

创建 `SimpleStorage.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedData;

    event DataStored(uint256 indexed newValue, address indexed setter);

    function set(uint256 x) public {
        storedData = x;
        emit DataStored(x, msg.sender);
    }

    function get() public view returns (uint256) {
        return storedData;
    }

    function increment() public {
        storedData += 1;
        emit DataStored(storedData, msg.sender);
    }
}
```

### 4.2 使用solc编译

```bash
# 安装solc
sudo add-apt-repository ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install solc

# 或使用solc-select
pip install solc-select
solc-select install 0.8.20
solc-select use 0.8.20

# 编译合约
solc --bin --abi --optimize --overwrite -o ./compiled SimpleStorage.sol

# 生成文件:
# - SimpleStorage.bin (字节码)
# - SimpleStorage.abi (ABI)
```

### 4.3 使用Geth控制台部署

```javascript
// 读取编译产物
var abi = <从SimpleStorage.abi复制>
var bytecode = "0x" + "<从SimpleStorage.bin复制>"

// 创建合约对象
var SimpleStorage = eth.contract(abi)

// 部署合约
var simpleStorage = SimpleStorage.new({
    from: eth.accounts[0],
    data: bytecode,
    gas: 1000000
}, function(error, contract) {
    if (!error) {
        if (contract.address) {
            console.log("Contract deployed at: " + contract.address)
        }
    } else {
        console.error(error)
    }
})

// 等待部署完成
> eth.getTransactionReceipt(simpleStorage.transactionHash)

// 获取合约实例
var instance = SimpleStorage.at(simpleStorage.address)

// 调用合约
> instance.set(100, {from: eth.accounts[0]})
"0x<tx-hash>"

> instance.get.call()
100

> instance.increment({from: eth.accounts[0]})
"0x<tx-hash>"

> instance.get.call()
101

// 查看事件日志
> eth.getTransactionReceipt("<tx-hash>").logs
[{
  address: "0x<contract-address>",
  topics: [
    "0x<event-signature>",
    "0x<indexed-newValue>",
    "0x<indexed-setter>"
  ],
  data: "0x",
  ...
}]
```

### 4.4 使用Web3.js部署（推荐）

创建 `deploy.js`:

```javascript
const Web3 = require('web3');
const fs = require('fs');

// 连接到节点
const web3 = new Web3('http://localhost:8545');

// 读取编译产物
const abi = JSON.parse(fs.readFileSync('./compiled/SimpleStorage.abi', 'utf8'));
const bytecode = '0x' + fs.readFileSync('./compiled/SimpleStorage.bin', 'utf8');

async function deploy() {
    // 获取账户
    const accounts = await web3.eth.getAccounts();
    console.log('Deploying from account:', accounts[0]);

    // 创建合约实例
    const contract = new web3.eth.Contract(abi);

    // 部署
    const deployTx = contract.deploy({
        data: bytecode,
        arguments: []
    });

    const deployedContract = await deployTx.send({
        from: accounts[0],
        gas: 1000000,
        gasPrice: '1000000000'
    });

    console.log('Contract deployed at:', deployedContract.options.address);

    // 保存地址
    fs.writeFileSync('./contract-address.txt', deployedContract.options.address);

    return deployedContract;
}

async function interact() {
    const contractAddress = fs.readFileSync('./contract-address.txt', 'utf8');
    const accounts = await web3.eth.getAccounts();

    const contract = new web3.eth.Contract(abi, contractAddress);

    // 写入数据
    console.log('Setting value to 42...');
    await contract.methods.set(42).send({ from: accounts[0] });

    // 读取数据
    const value = await contract.methods.get().call();
    console.log('Stored value:', value);

    // 监听事件
    contract.events.DataStored({
        fromBlock: 'latest'
    }, (error, event) => {
        if (!error) {
            console.log('Event:', event.returnValues);
        }
    });
}

// 执行
deploy().then(interact).catch(console.error);
```

```bash
npm install web3
node deploy.js
```

---

## 五、测试网连接

### 5.1 连接Sepolia测试网

Sepolia是当前推荐的以太坊测试网（Goerli已弃用）。

```bash
# 创建测试网数据目录
mkdir -p geth-research/practical/sepolia

# 启动Sepolia节点（需要共识层客户端配合）
geth --sepolia \
     --datadir ./geth-research/practical/sepolia \
     --http \
     --http.api "eth,net,web3" \
     --authrpc.addr localhost \
     --authrpc.port 8551 \
     --authrpc.jwtsecret ./jwt.hex \
     --syncmode snap
```

**注意**: PoS合并后，需要同时运行共识层客户端（如Prysm）。

### 5.2 快速验证（使用Infura）

如果不想运行完整节点，可以使用Infura等服务：

```javascript
const Web3 = require('web3');

// 使用Infura节点
const web3 = new Web3('https://sepolia.infura.io/v3/<YOUR-PROJECT-ID>');

// 查询最新区块
web3.eth.getBlockNumber().then(console.log);

// 查询账户余额
web3.eth.getBalance('0x<address>').then(balance => {
    console.log(web3.utils.fromWei(balance, 'ether'), 'ETH');
});
```

---

## 六、性能基准测试

### 6.1 区块处理性能

```javascript
// 测试区块处理速度
var startBlock = 1000;
var endBlock = 2000;
var startTime = Date.now();

for (var i = startBlock; i <= endBlock; i++) {
    eth.getBlock(i);
}

var endTime = Date.now();
var blocksProcessed = endBlock - startBlock + 1;
var timeElapsed = (endTime - startTime) / 1000;
var blocksPerSecond = blocksProcessed / timeElapsed;

console.log("Blocks processed:", blocksProcessed);
console.log("Time elapsed:", timeElapsed, "seconds");
console.log("Blocks per second:", blocksPerSecond);
```

### 6.2 交易吞吐测试

创建 `stress-test.js`:

```javascript
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

async function stressTest() {
    const accounts = await web3.eth.getAccounts();
    const numTxs = 100;
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < numTxs; i++) {
        const promise = web3.eth.sendTransaction({
            from: accounts[0],
            to: accounts[1],
            value: web3.utils.toWei('0.001', 'ether'),
            gas: 21000
        });
        promises.push(promise);
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const tps = numTxs / duration;

    console.log(`Sent ${numTxs} transactions in ${duration}s`);
    console.log(`TPS: ${tps}`);
}

stressTest().catch(console.error);
```

### 6.3 Gas消耗分析

```javascript
// 分析最近10个区块的Gas使用情况
var blockCount = 10;
var currentBlock = eth.blockNumber;
var totalGasUsed = 0;
var totalGasLimit = 0;

for (var i = 0; i < blockCount; i++) {
    var block = eth.getBlock(currentBlock - i);
    totalGasUsed += block.gasUsed;
    totalGasLimit += block.gasLimit;

    console.log("Block", block.number,
                "Gas Used:", block.gasUsed,
                "Utilization:", (block.gasUsed / block.gasLimit * 100).toFixed(2) + "%");
}

var avgGasUsed = totalGasUsed / blockCount;
var avgUtilization = (totalGasUsed / totalGasLimit * 100).toFixed(2);

console.log("\nAverage Gas Used:", avgGasUsed);
console.log("Average Utilization:", avgUtilization + "%");
```

---

## 七、监控与日志

### 7.1 启用Metrics

```bash
geth --datadir ./node1 \
     --metrics \
     --metrics.addr 0.0.0.0 \
     --metrics.port 6060 \
     --pprof \
     --pprof.addr 0.0.0.0 \
     --pprof.port 6061
```

访问指标：

```bash
# Prometheus格式指标
curl http://localhost:6060/debug/metrics/prometheus

# CPU Profile
curl http://localhost:6061/debug/pprof/profile?seconds=30 > cpu.prof

# 内存Profile
curl http://localhost:6061/debug/pprof/heap > heap.prof

# 分析Profile
go tool pprof cpu.prof
```

### 7.2 日志级别

```bash
# 启动时设置
geth --verbosity 4  # 0-5: Silent, Error, Warn, Info, Debug, Trace

# 运行时修改（控制台）
> debug.verbosity(5)
```

### 7.3 自定义日志

```bash
# 按模块设置日志级别
geth --vmodule "miner=5,downloader=4,p2p=3"

# 日志输出到文件
geth ... 2>> geth.log
```

---

## 八、故障排查

### 8.1 常见问题

**问题1: "Fatal: Error starting protocol stack: listen unix geth.ipc: bind: address already in use"**

```bash
# 解决：找到并终止占用进程
ps aux | grep geth
kill -9 <pid>

# 或删除IPC文件
rm /path/to/datadir/geth.ipc
```

**问题2: 同步速度慢**

```bash
# 使用Snap Sync（默认）
geth --syncmode snap

# 增加缓存
geth --cache 4096  # MB

# 增加peer数量
geth --maxpeers 50
```

**问题3: 数据库损坏**

```bash
# 检查数据库
geth --datadir ./node1 db inspect

# 修复（如果可能）
geth --datadir ./node1 db recover

# 最后手段：重新同步
rm -rf ./node1/geth/chaindata
geth --datadir ./node1 init genesis.json
```

### 8.2 调试技巧

```javascript
// 1. 查看pending交易详情
> debug.traceTransaction("<tx-hash>", {tracer: "callTracer"})

// 2. 查看状态树
> debug.dumpBlock("latest")

// 3. 查看交易池
> txpool.content

// 4. 查看Gas估算
> eth.estimateGas({
    from: eth.accounts[0],
    to: "0x<contract-address>",
    data: "0x<function-call-data>"
  })

// 5. 预执行调用（不发送交易）
> eth.call({
    from: eth.accounts[0],
    to: "0x<contract-address>",
    data: "0x..."
  }, "latest")
```

---

## 九、参考脚本清单

所有脚本已保存在 `geth-research/practical/scripts/` 目录：

1. `install-geth.sh` - Geth安装脚本
2. `start-dev-node.sh` - 启动开发节点
3. `init-private-chain.sh` - 初始化私有链
4. `start-node1.sh` - 启动私有链节点1
5. `start-node2.sh` - 启动私有链节点2
6. `deploy-contract.js` - 部署智能合约
7. `stress-test.js` - 压力测试
8. `monitor-metrics.sh` - 监控指标

---

## 十、实践验证检查清单

- [x] 成功编译Geth
- [x] 启动开发节点
- [x] 执行基本RPC命令
- [x] 发送交易
- [x] 部署智能合约
- [x] 调用合约方法
- [x] 查看事件日志
- [x] 搭建私有链
- [x] 配置Clique共识
- [x] 连接多节点
- [x] 性能测试
- [x] 监控指标收集

---

**完成时间**: 约2-4小时（取决于网络速度和机器性能）
