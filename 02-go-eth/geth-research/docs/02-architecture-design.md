# Go-Ethereum 架构设计

## 一、分层架构图

### 1.1 整体架构视图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            应用接口层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  geth CLI    │  │  JSON-RPC    │  │   GraphQL    │  │  WebSocket │  │
│  │   (命令行)    │  │   Server     │  │    Server    │  │   Server   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          区块链协议层 (eth/)                              │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  区块链同步模块 (downloader/)                                     │    │
│  │  • Full Sync / Fast Sync / Snap Sync / Light Sync             │    │
│  │  • Peer管理与任务调度                                            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────┐    │
│  │  Fetcher       │  │   TxPool        │  │   Handler            │    │
│  │  (区块获取器)   │  │  (交易池)        │  │  (协议处理器)         │    │
│  │  • Block Fetch │  │  • Pending      │  │  • eth/66, eth/67    │    │
│  │  • Tx Fetch    │  │  • Queue        │  │  • snap/1            │    │
│  └────────────────┘  └─────────────────┘  └──────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          区块链核心层 (core/)                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  BlockChain (blockchain.go)                                    │    │
│  │  • 区块链管理（插入、重组、验证）                                  │    │
│  │  • 链头管理（Canonical Chain）                                   │    │
│  │  • 缓存管理（区块、状态、收据）                                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │ StateDB      │  │  VM (EVM)   │  │  Consensus   │  │  Miner   │   │
│  │ (state/)     │  │  (vm/)      │  │ (consensus/) │  │ (miner/) │   │
│  │ • Account    │  │ • Bytecode  │  │ • Ethash     │  │ • Worker │   │
│  │ • Storage    │  │ • Opcode    │  │ • Beacon     │  │ • Payload│   │
│  │ • Code       │  │ • Gas       │  │ • Clique     │  │ Building │   │
│  └──────────────┘  └─────────────┘  └──────────────┘  └──────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Types (types/)                                                │    │
│  │  • Block, Header, Transaction, Receipt, Log                   │    │
│  └────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                           状态存储层 (trie/)                              │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Merkle Patricia Trie (MPT)                                    │    │
│  │  • StateTrie    (账户状态树)                                     │    │
│  │  • StorageTrie  (合约存储树)                                     │    │
│  │  • TxTrie       (交易树)                                         │    │
│  │  • ReceiptTrie  (收据树)                                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐                  │
│  │  StackTrie   │  │  SecureTrie │  │  Committer   │                  │
│  │  (栈式树)     │  │  (安全树)    │  │  (提交器)     │                  │
│  └──────────────┘  └─────────────┘  └──────────────┘                  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                         数据库层 (ethdb/)                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  LevelDB/PebbleDB (State & Recent Data)                        │    │
│  │  • chaindata/      (状态数据、最近区块)                           │    │
│  │  • Key-Value存储                                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Ancient Store (Historical Data)                               │    │
│  │  • ancient/        (历史区块、收据)                               │    │
│  │  • Flat File存储 (按表分离)                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          P2P网络层 (p2p/)                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  DevP2P Protocol Stack                                         │    │
│  │  • RLPx Transport (加密传输)                                     │    │
│  │  • Multiplexing (多路复用)                                       │    │
│  │  • Protocol Handshake                                          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │  DiscV4      │  │   DiscV5    │  │   Kademlia   │  │   ENR    │   │
│  │  (节点发现v4) │  │ (节点发现v5)│  │  (DHT路由)   │  │ (节点记录)│   │
│  └──────────────┘  └─────────────┘  └──────────────┘  └──────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  NAT Traversal (UPnP, NAT-PMP)                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 数据流向图

```
       ┌────────────┐
       │   User     │
       └─────┬──────┘
             │ eth_sendRawTransaction
             ▼
    ┌────────────────┐
    │  JSON-RPC API  │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐        ┌──────────────┐
    │    TxPool      │◀──────▶│  P2P Network │ (TransactionsMsg)
    └────────┬───────┘        └──────────────┘
             │ Pending()
             ▼
    ┌────────────────┐
    │  Miner/Worker  │
    └────────┬───────┘
             │ BuildBlock()
             ▼
    ┌────────────────┐
    │ StateProcessor │
    └────────┬───────┘
             │ Process()
             ▼
    ┌────────────────┐        ┌──────────────┐
    │      EVM       │◀──────▶│   StateDB    │
    └────────┬───────┘        └──────┬───────┘
             │                       │
             │ ExecuteTransaction    │ GetState/SetState
             ▼                       ▼
    ┌────────────────┐        ┌──────────────┐
    │  Receipt/Log   │        │  Trie/Cache  │
    └────────┬───────┘        └──────┬───────┘
             │                       │
             └───────────┬───────────┘
                         ▼
                ┌─────────────────┐
                │   BlockChain    │
                │ InsertChain()   │
                └────────┬────────┘
                         │
                ┌────────┴────────┐
                ▼                 ▼
       ┌────────────────┐  ┌──────────────┐
       │  Consensus     │  │  Database    │
       │  Verify        │  │  WriteBlock  │
       └────────────────┘  └──────┬───────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  P2P Broadcast │ (NewBlockMsg)
                          └────────────────┘
```

---

## 二、关键模块详解

### 2.1 LES（Light Ethereum Subprotocol）- 轻节点协议

#### 设计目标

轻节点通过仅下载区块头，按需请求状态证明的方式，实现资源受限设备运行以太坊节点。

#### 协议特性

**LES/2协议（当前主要版本）**

```go
// les/protocol.go

const (
    // 请求消息
    GetBlockHeadersMsg     = 0x00  // 请求区块头
    GetBlockBodiesMsg      = 0x01  // 请求区块体
    GetReceiptsMsg         = 0x02  // 请求收据
    GetProofsMsg           = 0x03  // 请求Merkle证明（关键）
    GetCodeMsg             = 0x04  // 请求合约代码
    GetHelperTrieProofsMsg = 0x05  // 请求辅助树证明

    // 响应消息
    BlockHeadersMsg     = 0x06
    BlockBodiesMsg      = 0x07
    ReceiptsMsg         = 0x08
    ProofsMsg           = 0x09     // Merkle证明响应
    CodeMsg             = 0x0a
    HelperTrieProofsMsg = 0x0b

    // 服务通告
    AnnounceMsg = 0x10            // 全节点通告新区块头
)
```

**关键功能: Merkle证明验证**

```go
// light/odr.go (On-Demand Retrieval)

// 轻节点请求账户状态证明
type AccountRequest struct {
    Address common.Address
    Root    common.Hash    // 状态树根
}

// 全节点返回Merkle证明
type AccountProof struct {
    Proof    []rlp.RawValue  // Merkle路径节点
    Balance  *big.Int
    Nonce    uint64
    CodeHash common.Hash
}

// 轻节点验证证明
func VerifyAccountProof(root common.Hash, address common.Address, proof *AccountProof) error {
    key := crypto.Keccak256(address.Bytes())
    value, err := trie.VerifyProof(root, key, proof.Proof)
    if err != nil {
        return err
    }
    // 解码并验证账户数据
    // ...
    return nil
}
```

**资源消耗对比**

| 指标 | 全节点 | 轻节点 |
|------|--------|--------|
| 存储空间 | ~800GB | <1GB |
| 内存占用 | 8-16GB | 512MB-1GB |
| 同步时间 | 2-6小时 | <10分钟 |
| 查询能力 | 完整历史 | 有限（需证明）|

**源码位置**

```
/go-ethereum/les/
├── server.go          # LES服务端（全节点提供服务）
├── client.go          # LES客户端（轻节点）
├── odr.go             # On-Demand Retrieval
├── protocol.go        # 协议定义
└── flowcontrol/       # 流量控制（防止轻节点滥用）
```

---

### 2.2 Trie（默克尔树实现）

#### Merkle Patricia Trie (MPT) 原理

MPT是以太坊状态存储的核心数据结构，结合了Merkle Tree和Patricia Trie的特性。

**节点类型**

```go
// trie/node.go

type node interface {
    encode(w rlp.Writer) error
    cache() (hashNode, bool)
}

// 1. 叶子节点 (Leaf Node)
type leafNode struct {
    Key   []byte  // 剩余路径（压缩编码）
    Val   []byte  // 值（RLP编码）
    flags nodeFlag
}

// 2. 扩展节点 (Extension Node)
type extNode struct {
    Key   []byte  // 共享前缀
    Val   node    // 指向下一个节点
    flags nodeFlag
}

// 3. 分支节点 (Branch Node)
type branchNode struct {
    Children [17]node  // 16个hex分支 + 1个值槽
    flags    nodeFlag
}

// 4. 哈希节点 (Hash Node)
type hashNode []byte  // 32字节哈希（引用其他节点）
```

**编码规则（Compact Encoding）**

```
原始路径: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, a, b, c, d, e, f]

Leaf节点编码:
  偶数长度: [2, 0, path...]
  奇数长度: [3,    path...]

Extension节点编码:
  偶数长度: [0, 0, path...]
  奇数长度: [1,    path...]
```

**示例: 存储3个账户**

```
存储数据:
  "do" → "verb"
  "dog" → "puppy"
  "doge" → "coin"

构建MPT:
           root
            │
         ┌──▼──┐
         │ ext │ key="d"
         └──┬──┘
            │
         ┌──▼──┐
         │ ext │ key="o"
         └──┬──┘
            │
       ┌────┴────┐
       ▼         ▼
   ┌──────┐  ┌──────┐
   │ leaf │  │ ext  │ key="g"
   │ "verb"  └──┬───┘
   └──────┘     │
             ┌──┴───┐
             ▼      ▼
         ┌──────┐ ┌──────┐
         │ leaf │ │ ext  │ key="e"
         │"puppy"│ └──┬───┘
         └──────┘    │
                  ┌──▼──┐
                  │ leaf│
                  │"coin"│
                  └─────┘
```

**实际应用: 以太坊4种Trie**

```go
// core/types/block.go

type Header struct {
    Root         common.Hash  // 1. 状态树根 (State Trie)
    TxHash       common.Hash  // 2. 交易树根 (Tx Trie)
    ReceiptHash  common.Hash  // 3. 收据树根 (Receipt Trie)
    // ...
}

// core/state/database.go

type Account struct {
    Balance  *big.Int
    Nonce    uint64
    Root     common.Hash  // 4. 存储树根 (Storage Trie)
    CodeHash []byte
}
```

**优化技术**

1. **SecureTrie（安全树）**

```go
// trie/secure_trie.go

// 使用Keccak256哈希key，避免路径攻击
type SecureTrie struct {
    trie             Trie
    secKeyCache      map[string][]byte  // 原始key缓存
    secKeyCacheOwner *SecureTrie
}

func (t *SecureTrie) Update(key, value []byte) error {
    hk := crypto.Keccak256(key)  // 哈希化key
    t.secKeyCache[string(hk)] = common.CopyBytes(key)
    return t.trie.Update(hk, value)
}
```

2. **StackTrie（栈式树）**

```go
// trie/stacktrie.go

// 用于一次性写入场景（如区块生成），不可读
type StackTrie struct {
    nodeType uint8
    val      []byte
    key      []byte
    children [16]*StackTrie
    // 无缓存，立即写入数据库
}
```

3. **Pruning（状态裁剪）**

```bash
# Geth支持在线裁剪
geth snapshot prune-state \
  --datadir /path/to/data \
  --datadir.ancient /path/to/ancient

# 效果: 800GB → 400GB
```

**源码位置**

```
/go-ethereum/trie/
├── trie.go              # 核心Trie实现
├── secure_trie.go       # 安全树（哈希key）
├── stack_trie.go        # 栈式树（区块构建用）
├── node.go              # 节点类型定义
├── encoding.go          # Compact编码
├── proof.go             # Merkle证明生成/验证
├── committer.go         # 节点提交器
├── database.go          # Trie数据库缓存
└── sync.go              # 状态同步（Fast Sync用）
```

---

### 2.3 core/types（区块数据结构）

#### 核心数据类型

**1. Block（区块）**

```go
// core/types/block.go

type Block struct {
    header       *Header
    uncles       []*Header
    transactions Transactions

    // 缓存
    hash atomic.Value
    size atomic.Value

    // 收据（不在区块内传输，通过ReceiptHash验证）
    ReceivedAt   time.Time
    ReceivedFrom interface{}
}

type Header struct {
    ParentHash  common.Hash    // 父区块哈希
    UncleHash   common.Hash    // 叔块哈希（PoS后为空）
    Coinbase    common.Address // 矿工/验证者地址
    Root        common.Hash    // 状态树根
    TxHash      common.Hash    // 交易树根
    ReceiptHash common.Hash    // 收据树根
    Bloom       Bloom          // 日志布隆过滤器
    Difficulty  *big.Int       // 难度（PoS后为0）
    Number      *big.Int       // 区块号
    GasLimit    uint64         // Gas上限
    GasUsed     uint64         // 已用Gas
    Time        uint64         // 时间戳
    Extra       []byte         // 额外数据（32字节）
    MixDigest   common.Hash    // PoW: 混合哈希; PoS: PREVRANDAO
    Nonce       BlockNonce     // PoW: 随机数; PoS: 固定为0

    // EIP-1559
    BaseFee *big.Int           // 基础费用

    // EIP-4895 (上海升级 - 提款)
    WithdrawalsHash *common.Hash

    // EIP-4844 (Cancun升级 - Blob)
    BlobGasUsed *uint64
    ExcessBlobGas *uint64
    ParentBeaconRoot *common.Hash
}
```

**2. Transaction（交易）**

```go
// core/types/transaction.go

// 交易接口（支持多种类型）
type Transaction struct {
    inner TxData    // 内部数据（根据类型变化）
    time  time.Time // 首次见到的时间

    // 缓存
    hash atomic.Value
    size atomic.Value
    from atomic.Value
}

// EIP-2718: 交易类型
const (
    LegacyTxType     = 0x00  // 传统交易
    AccessListTxType = 0x01  // EIP-2930
    DynamicFeeTxType = 0x02  // EIP-1559
    BlobTxType       = 0x03  // EIP-4844
)

// EIP-1559 动态费用交易
type DynamicFeeTx struct {
    ChainID    *big.Int
    Nonce      uint64
    GasTipCap  *big.Int        // 最大小费（Priority Fee）
    GasFeeCap  *big.Int        // 最大总费用（Max Fee）
    Gas        uint64
    To         *common.Address // nil = 合约创建
    Value      *big.Int
    Data       []byte
    AccessList AccessList      // EIP-2930 访问列表

    // 签名
    V, R, S *big.Int
}

// EIP-4844 Blob交易（Proto-Danksharding）
type BlobTx struct {
    ChainID    *big.Int
    Nonce      uint64
    GasTipCap  *big.Int
    GasFeeCap  *big.Int
    Gas        uint64
    To         common.Address  // 必须有接收者
    Value      *big.Int
    Data       []byte
    AccessList AccessList

    BlobFeeCap *big.Int        // Blob Gas价格上限
    BlobHashes []common.Hash   // Blob版本化哈希

    // Sidecar（不在交易哈希中）
    Sidecar *BlobTxSidecar

    // 签名
    V, R, S *big.Int
}
```

**3. Receipt（收据）**

```go
// core/types/receipt.go

type Receipt struct {
    Type              uint8         // 交易类型
    PostState         []byte        // 执行后状态根（已废弃）
    Status            uint64        // 1=成功, 0=失败
    CumulativeGasUsed uint64        // 区块累计Gas
    Bloom             Bloom         // 日志布隆过滤器
    Logs              []*Log        // 事件日志

    TxHash          common.Hash   // 交易哈希
    ContractAddress common.Address // 创建的合约地址
    GasUsed         uint64        // 本交易Gas消耗

    // EIP-4844
    BlobGasUsed  uint64
    BlobGasPrice *big.Int
}

type Log struct {
    Address     common.Address  // 合约地址
    Topics      []common.Hash   // 索引主题（最多4个）
    Data        []byte          // 非索引数据
    BlockNumber uint64
    TxHash      common.Hash
    TxIndex     uint
    BlockHash   common.Hash
    Index       uint
    Removed     bool  // 链重组时为true
}
```

**4. 布隆过滤器（Bloom Filter）**

```go
// core/types/bloom.go

type Bloom [BloomByteLength]byte  // 256字节 = 2048位

// 用于快速检索日志
func CreateBloom(receipts Receipts) Bloom {
    bin := new(big.Int)
    for _, receipt := range receipts {
        for _, log := range receipt.Logs {
            bin.Or(bin, bloom9(log.Address.Bytes()))
            for _, topic := range log.Topics {
                bin.Or(bin, bloom9(topic.Bytes()))
            }
        }
    }
    return BytesToBloom(bin.Bytes())
}

// bloom9: 将数据映射到3个位位置
func bloom9(b []byte) *big.Int {
    h := crypto.Keccak256(b)
    v := new(big.Int)

    // 取3个位置
    for i := 0; i < 6; i += 2 {
        idx := 2047 - (binary.BigEndian.Uint16(h[i:])&0x7ff)
        v.SetBit(v, int(idx), 1)
    }
    return v
}
```

**使用示例: 查询事件日志**

```go
// eth/filters/filter.go

func (f *Filter) Logs(ctx context.Context) ([]*types.Log, error) {
    logs := make([]*types.Log, 0)

    for number := f.begin; number <= f.end; number++ {
        header := f.backend.GetHeaderByNumber(number)

        // 1. 布隆过滤器快速检查
        if !bloomFilter(header.Bloom, f.addresses, f.topics) {
            continue  // 跳过不匹配的区块
        }

        // 2. 获取完整收据
        receipts := f.backend.GetReceipts(ctx, header.Hash())

        // 3. 精确匹配
        for _, receipt := range receipts {
            for _, log := range receipt.Logs {
                if matchesFilter(log, f.addresses, f.topics) {
                    logs = append(logs, log)
                }
            }
        }
    }
    return logs, nil
}
```

**源码位置**

```
/go-ethereum/core/types/
├── block.go             # 区块与区块头
├── transaction.go       # 交易类型
├── transaction_signing.go # 交易签名
├── receipt.go           # 收据
├── log.go               # 事件日志
├── bloom9.go            # 布隆过滤器
├── hashing.go           # 哈希计算
├── gen_*.go             # 自动生成的编解码代码
└── dynamic_fee.go       # EIP-1559交易
```

---

## 三、交易生命周期流程图

```
┌─────────────┐
│  1. 提交    │
│  用户签名交易 │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  2. 广播                                            │
│  ┌───────────────┐         ┌──────────────────┐    │
│  │  JSON-RPC API │────────▶│   P2P Network    │    │
│  │eth_sendRawTx  │         │ TransactionsMsg  │    │
│  └───────────────┘         └──────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  3. 验证与分类 (TxPool)                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  validateTx()                                │  │
│  │  • 签名验证 (ECDSA recover)                   │  │
│  │  • Nonce检查 (防重放)                         │  │
│  │  • 余额检查 (balance >= value + gas*gasPrice)│  │
│  │  • Gas limit检查                             │  │
│  │  • 大小限制 (<= 128KB)                        │  │
│  └──────────────────────────────────────────────┘  │
│                       │                             │
│         ┌─────────────┴─────────────┐               │
│         ▼                           ▼               │
│  ┌────────────┐              ┌────────────┐        │
│  │  Pending   │              │   Queue    │        │
│  │ (nonce连续) │              │ (nonce有空隙)│        │
│  │ 可打包       │              │ 等待前置tx  │        │
│  └────────────┘              └────────────┘        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  4. 排序与选择 (Miner)                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  worker.fillTransactions()                   │  │
│  │  • 按 gasPrice 降序排序                       │  │
│  │  • 同价格按 nonce 升序                         │  │
│  │  • 优先本地交易                               │  │
│  │  • 填充直到达到 block.gasLimit               │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  5. 执行 (EVM)                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  StateTransition.TransitionDb()              │  │
│  │  1. 检查 nonce                                │  │
│  │  2. 购买 Gas (扣除 gasLimit * gasPrice)       │  │
│  │  3. 执行交易:                                 │  │
│  │     • 转账: 更新余额                          │  │
│  │     • 合约调用: EVM.Call()                    │  │
│  │     • 合约创建: EVM.Create()                  │  │
│  │  4. Gas退款 (unused + refund)                │  │
│  │  5. 矿工费 (gasUsed * gasPrice → coinbase)   │  │
│  │  6. 生成 Receipt                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  执行结果:                                          │
│  ┌────────────┬─────────────────────────────────┐  │
│  │ 成功       │ • 状态更新                       │  │
│  │ (Status=1) │ • 生成日志                       │  │
│  │            │ • 返回数据                       │  │
│  ├────────────┼─────────────────────────────────┤  │
│  │ 失败       │ • 回滚状态 (Revert)              │  │
│  │ (Status=0) │ • 仍消耗 Gas                     │  │
│  │            │ • 错误消息                       │  │
│  └────────────┴─────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  6. 打包进区块                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  FinalizeAndAssemble()                       │  │
│  │  • 计算 TxHash = Hash(Transactions)          │  │
│  │  • 计算 ReceiptHash = Hash(Receipts)         │  │
│  │  • 计算 Bloom = CreateBloom(Receipts)        │  │
│  │  • 更新状态树 Root                            │  │
│  │  • 构造 Block Header                          │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  7. 共识验证                                         │
│  PoW时期:                    PoS时期:               │
│  • 挖矿寻找nonce             • 接收Beacon Chain指令  │
│  • 满足difficulty            • 验证者签名           │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  8. 区块插入 (BlockChain)                           │
│  ┌──────────────────────────────────────────────┐  │
│  │  InsertChain()                               │  │
│  │  1. 验证区块头 (父哈希、难度、Gas等)           │  │
│  │  2. 执行所有交易                              │  │
│  │  3. 验证状态根 (计算值 = 声明值)              │  │
│  │  4. 验证交易树根、收据树根                    │  │
│  │  5. 写入数据库:                               │  │
│  │     • State → LevelDB                        │  │
│  │     • Block → Ancient Store                  │  │
│  │  6. 更新 Canonical Chain                     │  │
│  │  7. 触发事件 (ChainHeadEvent)                │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  9. 广播 & 清理                                      │
│  • P2P广播 NewBlockMsg                              │
│  • 从 TxPool 移除已确认交易                          │
│  • 更新 pending nonce                               │
│                                                     │
│  如果链重组 (Reorg):                                 │
│  • 回滚旧链交易到 TxPool                             │
│  • 移除新链交易                                      │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  10. 确认        │
              │  等待N个区块确认  │
              │  (推荐 12-32)    │
              └─────────────────┘
```

---

## 四、账户状态存储模型

### 4.1 World State 结构

```
┌─────────────────────────────────────────────────────────┐
│                   World State Tree                      │
│              (StateRoot in Block Header)                │
└──────────────────────────┬──────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ┌──────────────┐              ┌──────────────┐
    │   Account    │              │   Account    │
    │  0x1234...   │              │  0xabcd...   │
    └──────┬───────┘              └──────┬───────┘
           │                             │
    ┌──────▼─────────────┐        ┌──────▼─────────────┐
    │ Balance: 10 ETH    │        │ Balance: 5 ETH     │
    │ Nonce: 42          │        │ Nonce: 0           │
    │ CodeHash: 0x00..   │        │ CodeHash: 0xc5a... │ ◀─┐
    │ StorageRoot: 0x... │ ◀─┐    │ StorageRoot: 0x... │ ◀─┼─┐
    └────────────────────┘   │    └────────────────────┘   │ │
                             │                             │ │
                             │         ┌───────────────────┘ │
                             │         │                     │
                             │         ▼                     │
                             │   ┌─────────────┐            │
                             │   │ Code        │            │
                             │   │ (Bytecode)  │            │
                             │   └─────────────┘            │
                             │                              │
                             │   ┌────────────────────────┐ │
                             └──▶│ Storage Trie           │◀┘
                                 │ (Contract State)       │
                                 └────────┬───────────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                 ┌────────────┐    ┌────────────┐   ┌────────────┐
                 │ slot 0     │    │ slot 1     │   │ slot 0x9f..│
                 │ value: 100 │    │ value: 200 │   │ value: 0x..│
                 └────────────┘    └────────────┘   └────────────┘
```

### 4.2 账户模型 vs UTXO模型对比

| 特性 | 以太坊 (Account Model) | 比特币 (UTXO Model) |
|------|------------------------|---------------------|
| 状态表示 | 账户余额 | 未花费输出集合 |
| 存储结构 | 全局状态树 | UTXO集合 |
| 余额查询 | O(1) - 直接读账户 | O(n) - 遍历UTXO |
| 隐私性 | 低（地址可追踪） | 高（每笔交易新地址）|
| 智能合约 | 原生支持 | 有限（Script）|
| 并行处理 | 困难（状态竞争） | 容易（UTXO独立）|
| 存储效率 | 需存储所有账户 | 仅存储未花费输出 |

### 4.3 状态访问示例

```go
// core/state/statedb.go

type StateDB struct {
    db   Database             // 底层trie数据库
    trie Trie                 // 主状态树

    // 账户缓存
    stateObjects      map[common.Address]*stateObject
    stateObjectsDirty map[common.Address]struct{}

    // 日志
    logs    map[common.Hash][]*types.Log
    logSize uint

    // 预编译
    preimages map[common.Hash][]byte

    // 快照（用于回滚）
    journal        *journal
    validRevisions []revision
    nextRevisionId int

    // 指标
    AccountReads   time.Duration
    AccountHashes  time.Duration
    AccountUpdates time.Duration
    AccountCommits time.Duration
    StorageReads   time.Duration
    StorageHashes  time.Duration
    StorageUpdates time.Duration
    StorageCommits time.Duration
}

// 读取账户余额
func (s *StateDB) GetBalance(addr common.Address) *big.Int {
    stateObject := s.getStateObject(addr)
    if stateObject != nil {
        return stateObject.Balance()
    }
    return common.Big0
}

// 更新账户余额
func (s *StateDB) SetBalance(addr common.Address, amount *big.Int) {
    stateObject := s.GetOrNewStateObject(addr)
    if stateObject != nil {
        stateObject.SetBalance(amount)
    }
}

// 读取合约存储
func (s *StateDB) GetState(addr common.Address, hash common.Hash) common.Hash {
    stateObject := s.getStateObject(addr)
    if stateObject != nil {
        return stateObject.GetState(s.db, hash)
    }
    return common.Hash{}
}

// 写入合约存储
func (s *StateDB) SetState(addr common.Address, key, value common.Hash) {
    stateObject := s.GetOrNewStateObject(addr)
    if stateObject != nil {
        stateObject.SetState(s.db, key, value)
    }
}

// 提交状态（计算新状态根）
func (s *StateDB) Commit(deleteEmptyObjects bool) (common.Hash, error) {
    // 1. 提交所有脏账户到trie
    for addr := range s.stateObjectsDirty {
        obj := s.stateObjects[addr]
        if obj.suicided || (deleteEmptyObjects && obj.empty()) {
            s.deleteStateObject(obj)
        } else {
            obj.updateRoot(s.db)   // 更新存储树根
            s.updateStateObject(obj) // 更新状态树
        }
    }

    // 2. 计算新状态根
    root, err := s.trie.Commit(nil)
    return root, err
}
```

### 4.4 存储优化: Verkle Tree（未来）

以太坊计划在未来升级中引入Verkle Tree替代MPT，以减少状态证明大小。

**对比**

| 特性 | MPT | Verkle Tree |
|------|-----|-------------|
| 证明大小 | ~3KB | ~150字节 |
| 分支因子 | 16 | 256 |
| 哈希算法 | Keccak256 | Pedersen |
| 无状态验证 | 需大量数据 | 轻量级 |

---

## 五、源码目录索引

```
/go-ethereum/
├── accounts/          # 账户管理（Keystore, 硬件钱包）
├── cmd/
│   ├── geth/         # Geth主程序
│   ├── clef/         # 独立签名工具
│   ├── bootnode/     # 引导节点
│   └── evm/          # 独立EVM工具
├── consensus/        # 共识引擎
│   ├── ethash/       # Ethash (PoW)
│   ├── beacon/       # Beacon (PoS)
│   └── clique/       # Clique (PoA)
├── core/             # 区块链核心
│   ├── types/        # 数据类型
│   ├── vm/           # EVM虚拟机
│   ├── state/        # 状态管理
│   ├── txpool/       # 交易池
│   ├── rawdb/        # 数据库访问
│   └── blockchain.go # 区块链主逻辑
├── crypto/           # 加密原语
├── eth/              # 以太坊协议
│   ├── protocols/    # 协议实现
│   ├── downloader/   # 区块下载
│   ├── fetcher/      # 区块获取
│   ├── catalyst/     # Engine API (PoS)
│   └── tracers/      # 交易追踪
├── ethdb/            # 数据库接口
├── les/              # 轻节点协议
├── light/            # 轻节点
├── miner/            # 挖矿/区块构建
├── p2p/              # P2P网络
│   ├── discover/     # 节点发现
│   ├── enode/        # 节点表示
│   └── nat/          # NAT穿透
├── params/           # 链配置参数
├── rlp/              # RLP编码
├── rpc/              # JSON-RPC服务器
├── trie/             # Merkle Patricia Trie
└── internal/         # 内部工具
    ├── ethapi/       # RPC API实现
    └── web3ext/      # Web3扩展
```

---

## 六、架构演进

### 6.1 主要里程碑

```
2015.07  Frontier (边境)
         └─ 主网上线，基础功能

2016.03  Homestead (家园)
         └─ 协议稳定，移除Canary合约

2017.10  Byzantium (拜占庭)
         └─ 降低区块奖励，增加难度炸弹延迟

2019.02  Constantinople (君士坦丁堡)
         └─ EIP-1234 (奖励调整), EIP-1283 (SSTORE优化)

2019.12  Istanbul (伊斯坦布尔)
         └─ EIP-2028 (Calldata Gas降低), EIP-1344 (ChainID)

2020.12  Berlin (柏林)
         └─ EIP-2929 (Gas成本调整), EIP-2718 (交易类型)

2021.08  London (伦敦)
         └─ EIP-1559 (动态费用), EIP-3554 (难度炸弹推迟)

2022.09  The Merge (合并)
         └─ PoW → PoS，执行层与共识层分离

2023.04  Shanghai (上海)
         └─ EIP-4895 (Beacon链提款)

2024.03  Cancun (坎昆)
         └─ EIP-4844 (Proto-Danksharding)
```

### 6.2 未来路线图

```
计划中:
- Verkle Tree (状态树升级)
- Single Slot Finality (单时隙最终性)
- Account Abstraction (EIP-4337)
- PBS (Proposer-Builder Separation)
- Full Danksharding (EIP-4844完整版)
```

---

**注**: 所有架构图和流程图均基于Geth 1.13.x版本（2024年）的实现。
