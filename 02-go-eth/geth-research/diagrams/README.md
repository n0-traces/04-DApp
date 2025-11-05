# Geth 架构图表

本目录包含 Go-Ethereum 的各种架构图和流程图，均使用 Mermaid 格式绘制。

> **提示**: 在 GitHub 上查看本文件，所有图表会自动渲染。如果在本地查看，推荐使用支持 Mermaid 的 Markdown 编辑器（如 VS Code + Mermaid 插件）。

---

## 1. 五层架构图

展示 Geth 的完整分层架构，从应用层到网络层的5层结构。

```mermaid
graph TB
    subgraph Application["应用接口层 (Application Layer)"]
        CLI[geth CLI]
        RPC[JSON-RPC Server]
        GraphQL[GraphQL Server]
        WS[WebSocket Server]
    end

    subgraph Protocol["区块链协议层 (Protocol Layer)"]
        Downloader[Downloader<br/>区块同步]
        Fetcher[Fetcher<br/>区块获取]
        TxPool[TxPool<br/>交易池]
        Handler[Protocol Handler<br/>eth/66, eth/67, snap/1]
    end

    subgraph Core["区块链核心层 (Core Layer)"]
        BlockChain[BlockChain<br/>链管理]
        StateDB[StateDB<br/>状态管理]
        VM[EVM<br/>虚拟机]
        Consensus[Consensus<br/>共识引擎]
        Miner[Miner<br/>区块构建]
    end

    subgraph Storage["状态存储层 (Storage Layer)"]
        Trie[MPT Trie<br/>默克尔树]
        LevelDB[(LevelDB<br/>状态数据库)]
        Ancient[(Ancient Store<br/>历史数据)]
    end

    subgraph Network["P2P网络层 (Network Layer)"]
        DevP2P[DevP2P<br/>传输协议]
        Kademlia[Kademlia DHT<br/>节点发现]
        DiscV5[DiscV5<br/>发现协议]
    end

    CLI --> RPC
    RPC --> Handler
    GraphQL --> Handler
    WS --> Handler

    Handler --> Downloader
    Handler --> Fetcher
    Handler --> TxPool

    Downloader --> BlockChain
    Fetcher --> BlockChain
    TxPool --> Miner

    Miner --> VM
    BlockChain --> StateDB
    BlockChain --> Consensus
    VM --> StateDB

    StateDB --> Trie
    Trie --> LevelDB
    BlockChain --> Ancient

    Handler --> DevP2P
    DevP2P --> Kademlia
    DevP2P --> DiscV5

    classDef appLayer fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef protocolLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef coreLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storageLayer fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef networkLayer fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class CLI,RPC,GraphQL,WS appLayer
    class Downloader,Fetcher,TxPool,Handler protocolLayer
    class BlockChain,StateDB,VM,Consensus,Miner coreLayer
    class Trie,LevelDB,Ancient storageLayer
    class DevP2P,Kademlia,DiscV5 networkLayer
```

**说明**:
- **应用接口层**: 提供用户交互接口（CLI、RPC、GraphQL、WebSocket）
- **区块链协议层**: 处理 P2P 协议、区块同步、交易池管理
- **区块链核心层**: 实现区块链逻辑、状态管理、EVM 执行、共识验证
- **状态存储层**: 使用 MPT 树存储状态，LevelDB 持久化，Ancient Store 存历史数据
- **P2P网络层**: 实现节点发现（Kademlia DHT）和数据传输（DevP2P）

---

## 2. 交易生命周期流程图

展示一笔交易从提交到最终确认的完整生命周期（10个阶段）。

```mermaid
graph TD
    Start([用户提交交易]) --> Submit[1. 提交<br/>签名交易]

    Submit --> Broadcast[2. 广播<br/>JSON-RPC API<br/>P2P Network]

    Broadcast --> Validate[3. 验证与分类<br/>TxPool]

    Validate --> CheckSig{签名验证}
    CheckSig -->|失败| Reject1[拒绝]
    CheckSig -->|成功| CheckNonce{Nonce检查}

    CheckNonce -->|无效| Reject2[拒绝]
    CheckNonce -->|有效| CheckBalance{余额检查}

    CheckBalance -->|不足| Reject3[拒绝]
    CheckBalance -->|充足| Classify{分类}

    Classify -->|Nonce连续| Pending[Pending队列<br/>可打包]
    Classify -->|Nonce有空隙| Queue[Queue队列<br/>等待前置交易]

    Queue -.->|前置交易确认| Pending

    Pending --> Sort[4. 排序与选择<br/>Miner]
    Sort --> SortDetail[按gasPrice降序<br/>同价格按nonce升序<br/>填充到gasLimit]

    SortDetail --> Execute[5. 执行<br/>EVM]

    Execute --> ExecSteps[执行步骤:<br/>1. 检查nonce<br/>2. 购买Gas<br/>3. 执行交易<br/>4. Gas退款<br/>5. 矿工费]

    ExecSteps --> ExecResult{执行结果}

    ExecResult -->|成功| Success[Status=1<br/>状态更新<br/>生成日志]
    ExecResult -->|失败| Fail[Status=0<br/>回滚状态<br/>仍消耗Gas]

    Success --> Pack[6. 打包进区块]
    Fail --> Pack

    Pack --> PackDetail[计算TxHash<br/>计算ReceiptHash<br/>更新StateRoot<br/>构造Header]

    PackDetail --> Consensus[7. 共识验证]

    Consensus --> ConsType{共识类型}
    ConsType -->|PoW| Mining[Ethash挖矿<br/>寻找nonce]
    ConsType -->|PoS| BeaconChain[Beacon Chain<br/>验证者签名]

    Mining --> Insert[8. 区块插入<br/>BlockChain]
    BeaconChain --> Insert

    Insert --> InsertSteps[1. 验证区块头<br/>2. 执行所有交易<br/>3. 验证状态根<br/>4. 写入数据库<br/>5. 更新链头<br/>6. 触发事件]

    InsertSteps --> BroadcastBlock[9. 广播区块<br/>P2P NewBlockMsg]

    BroadcastBlock --> Cleanup[清理TxPool<br/>移除已确认交易]

    Cleanup --> Confirm[10. 确认<br/>等待N个区块]

    Confirm --> End([交易最终确认])

    Insert -.->|发生Reorg| Reorg[链重组处理]
    Reorg -.-> ReorgSteps[回滚旧链交易<br/>重新加入TxPool]
    ReorgSteps -.-> Pending

    classDef submitStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef validateStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef executeStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef consensusStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef finalStyle fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef rejectStyle fill:#ffebee,stroke:#c62828,stroke-width:2px

    class Start,Submit,Broadcast submitStyle
    class Validate,CheckSig,CheckNonce,CheckBalance,Classify,Pending,Queue validateStyle
    class Sort,SortDetail,Execute,ExecSteps,ExecResult,Success,Fail executeStyle
    class Pack,PackDetail,Consensus,ConsType,Mining,BeaconChain consensusStyle
    class Insert,InsertSteps,BroadcastBlock,Cleanup,Confirm,End finalStyle
    class Reject1,Reject2,Reject3 rejectStyle
```

**关键阶段**:
1. **提交广播**: 用户签名 → RPC/P2P 广播
2. **验证分类**: 签名/nonce/余额验证 → Pending/Queue 分类
3. **排序执行**: Gas 价格排序 → EVM 执行
4. **打包共识**: 构造区块 → PoW 挖矿或 PoS 验证
5. **插入确认**: 写入数据库 → 广播 → 等待确认

---

## 3. 状态存储模型

展示以太坊的 World State 树形结构，包括账户、代码、存储的组织方式。

```mermaid
graph TD
    subgraph WorldState["World State Tree (StateRoot in Block Header)"]
        Root[(StateRoot<br/>Keccak256 Hash)]
    end

    Root --> Account1[Account 0x1234...]
    Root --> Account2[Account 0xabcd...]
    Root --> AccountN[Account 0x...]

    subgraph Acc1["Account 1 (EOA)"]
        Account1 --> Balance1[Balance: 10 ETH]
        Account1 --> Nonce1[Nonce: 42]
        Account1 --> CodeHash1[CodeHash: 0x00...<br/>空代码]
        Account1 --> StorageRoot1[StorageRoot: 0x00...<br/>空存储]
    end

    subgraph Acc2["Account 2 (Contract)"]
        Account2 --> Balance2[Balance: 5 ETH]
        Account2 --> Nonce2[Nonce: 1]
        Account2 --> CodeHash2[CodeHash: 0xc5a...]
        Account2 --> StorageRoot2[StorageRoot: 0x...]
    end

    CodeHash2 --> Code[Contract Bytecode<br/>EVM Code]

    StorageRoot2 --> StorageTrie[(Storage Trie<br/>Contract State)]

    StorageTrie --> Slot0[Slot 0<br/>Value: 100]
    StorageTrie --> Slot1[Slot 1<br/>Value: 200]
    StorageTrie --> SlotN[Slot 0x9f...<br/>Value: 0x...]

    subgraph Database["Database Layer"]
        Root -.->|存储在| LevelDB[(LevelDB<br/>Key-Value Store)]
        Code -.->|存储在| LevelDB
        StorageTrie -.->|存储在| LevelDB
    end

    subgraph MPT["Merkle Patricia Trie Structure"]
        MPTRoot[Trie Root] --> Branch[Branch Node<br/>16 children]
        Branch --> Extension[Extension Node<br/>共享前缀]
        Extension --> Leaf[Leaf Node<br/>Key-Value]
        Branch --> Leaf2[Leaf Node]

        Branch -.->|Hash引用| HashNode[Hash Node<br/>32 bytes]
    end

    classDef rootStyle fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef accountStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storageStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef codeStyle fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef dbStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef mptStyle fill:#fff9c4,stroke:#f57f17,stroke-width:2px

    class Root rootStyle
    class Account1,Account2,AccountN,Balance1,Nonce1,CodeHash1,StorageRoot1,Balance2,Nonce2,CodeHash2,StorageRoot2 accountStyle
    class StorageTrie,Slot0,Slot1,SlotN storageStyle
    class Code codeStyle
    class LevelDB dbStyle
    class MPTRoot,Branch,Extension,Leaf,Leaf2,HashNode mptStyle
```

**存储层级**:
- **StateRoot**: 全局状态树根，记录在区块头
- **Account**: 每个地址有4个字段（Balance, Nonce, CodeHash, StorageRoot）
- **Code**: 合约字节码（通过 CodeHash 引用）
- **Storage Trie**: 合约状态存储（每个合约独立的树）
- **LevelDB**: 底层 Key-Value 数据库

**MPT节点类型**:
- **Branch Node**: 16个子节点（hex）+ 1个值槽
- **Extension Node**: 共享前缀压缩
- **Leaf Node**: 键值对终点
- **Hash Node**: 32字节哈希引用（懒加载）

---

## 4. Snap Sync 协议流程

展示 Snap Sync 快照同步的消息交互流程（时序图）。

```mermaid
sequenceDiagram
    participant User as 用户节点
    participant Peer as Peer节点
    participant DB as 本地数据库

    Note over User,Peer: Snap Sync 启动

    User->>Peer: 1. GetBlockHeaders<br/>请求区块头
    Peer-->>User: BlockHeaders<br/>返回区块头

    User->>DB: 验证并存储区块头

    Note over User: 选择Pivot点<br/>(当前高度-1024)

    par 并行下载账户快照
        User->>Peer: 2. GetAccountRange<br/>请求账户范围 [0x00...0x10...]
        Peer-->>User: AccountRange<br/>返回账户数据 + Merkle证明

        User->>Peer: GetAccountRange<br/>请求账户范围 [0x10...0x20...]
        Peer-->>User: AccountRange<br/>返回账户数据 + Merkle证明

        User->>Peer: GetAccountRange<br/>请求账户范围 [0x20...0x30...]
        Peer-->>User: AccountRange<br/>返回账户数据 + Merkle证明
    end

    User->>DB: 存储账户快照

    par 并行下载存储快照
        User->>Peer: 3. GetStorageRanges<br/>请求合约存储
        Peer-->>User: StorageRanges<br/>返回存储数据 + 证明

        User->>Peer: GetStorageRanges<br/>请求合约存储
        Peer-->>User: StorageRanges<br/>返回存储数据 + 证明
    end

    User->>DB: 存储合约存储数据

    User->>Peer: 4. GetByteCodes<br/>请求合约字节码
    Peer-->>User: ByteCodes<br/>返回字节码

    User->>DB: 存储字节码

    Note over User: 后台修复Merkle树

    User->>User: 5. 验证状态根<br/>计算Trie Root

    alt 验证成功
        User->>User: 状态同步完成
        Note over User: 切换到Full Sync模式
    else 验证失败
        User->>User: 检测缺失数据
        User->>Peer: 请求缺失的账户/存储
        Peer-->>User: 补充缺失数据
    end

    par 并行下载最近区块
        User->>Peer: GetBlockBodies<br/>请求Pivot后的区块体
        Peer-->>User: BlockBodies<br/>返回交易和叔块

        User->>Peer: GetReceipts<br/>请求收据
        Peer-->>User: Receipts<br/>返回收据
    end

    User->>DB: 执行并存储区块

    Note over User: Snap Sync 完成<br/>总耗时: 2-4小时

    User->>User: 切换到Full Sync<br/>逐块执行新区块
```

**性能优势**:
- **并行下载**: 多个账户范围同时请求（3-5倍提升）
- **快照获取**: 直接下载 Pivot 点状态（跳过早期执行）
- **后台修复**: Merkle 树在后台重建（不阻塞同步）
- **Merkle 证明**: 验证数据完整性（无需信任 Peer）

**对比传统 Fast Sync**:
- Fast Sync: 6-12小时
- Snap Sync: 2-4小时
- 提升: 3-5倍

---

## 5. EVM 执行流程

展示 EVM 执行交易的详细流程，包括所有操作码类型和状态管理。

```mermaid
graph TD
    Start([交易进入EVM]) --> Init[1. 初始化EVM环境]
    Init --> InitSteps[创建BlockContext<br/>创建TxContext<br/>实例化StateDB]
    InitSteps --> PrepareContract[2. 准备执行环境]
    PrepareContract --> ContractType{交易类型}

    ContractType -->|转账| Transfer[简单转账<br/>更新余额]
    ContractType -->|合约调用| Call[EVM.Call]
    ContractType -->|合约创建| Create[EVM.Create]

    Call --> CreateContract[创建Contract对象]
    Create --> CreateContract
    CreateContract --> ContractDetails[Contract包含:<br/>Code 字节码<br/>Input 输入数据<br/>Gas 可用Gas<br/>Address 合约地址<br/>Caller 调用者]

    ContractDetails --> AllocateGas[3. 分配Gas]
    AllocateGas --> GasCalc[从账户扣除<br/>gasLimit * gasPrice]
    GasCalc --> Interpreter[4. 字节码解释器循环]
    Interpreter --> ReadOpcode[读取操作码<br/>opcode byte]

    ReadOpcode --> CheckGas{检查Gas}
    CheckGas -->|不足| OutOfGas[抛出OutOfGas异常]
    CheckGas -->|充足| DeductGas[扣除操作Gas]
    DeductGas --> ExecuteOp[执行操作]
    ExecuteOp --> OpType{操作码类型}

    OpType -->|栈操作| StackOp[PUSH, POP, DUP, SWAP]
    OpType -->|内存操作| MemoryOp[MLOAD, MSTORE, MSTORE8]
    OpType -->|存储操作| StorageOp[SLOAD, SSTORE]
    OpType -->|控制流| ControlOp[JUMP, JUMPI, PC, JUMPDEST]
    OpType -->|环境信息| EnvOp[ADDRESS, BALANCE, CALLER]
    OpType -->|区块信息| BlockOp[BLOCKHASH, COINBASE, TIMESTAMP]
    OpType -->|调用操作| CallOp[CALL, DELEGATECALL, CREATE]
    OpType -->|哈希| SHA3Op[SHA3/KECCAK256]
    OpType -->|日志| LogOp[LOG0-LOG4]
    OpType -->|终止| StopOp[STOP]
    OpType -->|返回| ReturnOp[RETURN]
    OpType -->|回滚| RevertOp[REVERT]
    OpType -->|自毁| SelfDestructOp[SELFDESTRUCT]

    StackOp --> Stack[操作Stack<br/>最大1024项]
    Stack --> UpdateGas1[更新Gas计数器]

    MemoryOp --> Memory[操作Memory<br/>动态扩展]
    Memory --> MemGasCost[计算内存扩展Gas]
    MemGasCost --> UpdateGas2[更新Gas计数器]

    StorageOp --> CheckAccess{访问类型}
    CheckAccess -->|冷访问| ColdGas[2100 Gas]
    CheckAccess -->|热访问| WarmGas[100 Gas]
    ColdGas --> Storage[StateDB Storage]
    WarmGas --> Storage
    Storage --> StorageRefund[SSTORE退款]
    StorageRefund --> UpdateGas3[更新Gas计数器]

    ControlOp --> ValidateJump{验证JUMPDEST}
    ValidateJump -->|无效| InvalidJump[抛出异常]
    ValidateJump -->|有效| UpdatePC[更新程序计数器]
    UpdatePC --> UpdateGas4[更新Gas计数器]

    EnvOp --> ReadContext[读取TxContext]
    ReadContext --> UpdateGas5[更新Gas计数器]

    BlockOp --> ReadBlock[读取BlockContext]
    ReadBlock --> UpdateGas6[更新Gas计数器]

    CallOp --> CheckDepth{调用深度}
    CheckDepth -->|大于1024| DepthError[抛出深度异常]
    CheckDepth -->|小于等于1024| SubCall[递归调用EVM]
    SubCall --> ReturnData[返回数据]
    ReturnData --> UpdateGas7[更新Gas计数器]

    SHA3Op --> UpdateGas8[更新Gas计数器]
    LogOp --> EmitLog[写入Receipt.Logs]
    EmitLog --> UpdateGas9[更新Gas计数器]

    StopOp --> UpdateGas10[更新Gas计数器]
    ReturnOp --> UpdateGas11[更新Gas计数器]
    RevertOp --> UpdateGas12[更新Gas计数器]
    SelfDestructOp --> UpdateGas13[更新Gas计数器]

    UpdateGas1 --> CheckTerminate{终止条件}
    UpdateGas2 --> CheckTerminate
    UpdateGas3 --> CheckTerminate
    UpdateGas4 --> CheckTerminate
    UpdateGas5 --> CheckTerminate
    UpdateGas6 --> CheckTerminate
    UpdateGas7 --> CheckTerminate
    UpdateGas8 --> CheckTerminate
    UpdateGas9 --> CheckTerminate
    UpdateGas10 --> CheckTerminate
    UpdateGas11 --> CheckTerminate
    UpdateGas12 --> CheckTerminate
    UpdateGas13 --> CheckTerminate

    CheckTerminate -->|STOP/RETURN| NormalEnd[正常结束]
    CheckTerminate -->|REVERT| RevertEnd[回滚结束]
    CheckTerminate -->|异常| ErrorEnd[异常结束]
    CheckTerminate -->|继续| ReadOpcode

    NormalEnd --> Finalize[5. 状态提交]
    RevertEnd --> Rollback[回滚状态]
    ErrorEnd --> Rollback
    OutOfGas --> Rollback
    InvalidJump --> Rollback
    DepthError --> Rollback

    Finalize --> FinalSteps[1. 更新StateDB<br/>2. Gas退款<br/>3. 矿工费<br/>4. 生成Receipt]
    Rollback --> RollbackSteps[1. 回滚状态<br/>2. 仍消耗Gas<br/>3. Receipt.Status=0]

    FinalSteps --> Result[6. 返回结果]
    RollbackSteps --> Result
    Transfer --> SimpleTransfer[更新余额<br/>无需解释器]
    SimpleTransfer --> Result
    Result --> End([执行完成])

    classDef initStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef execStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef opStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storageStyle fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef errorStyle fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef finalStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class Start,Init,InitSteps,PrepareContract,ContractType,CreateContract,ContractDetails initStyle
    class AllocateGas,GasCalc,Interpreter,ReadOpcode,CheckGas,DeductGas,ExecuteOp,OpType execStyle
    class StackOp,Stack,MemoryOp,Memory,MemGasCost,StorageOp,Storage,StorageRefund,ControlOp,EnvOp,BlockOp,CallOp,ReturnData,SHA3Op,LogOp,EmitLog,StopOp,ReturnOp,RevertOp,SelfDestructOp opStyle
    class CheckAccess,ColdGas,WarmGas storageStyle
    class OutOfGas,InvalidJump,DepthError,ErrorEnd,Rollback,RollbackSteps errorStyle
    class NormalEnd,Finalize,FinalSteps,Result,End,Transfer,SimpleTransfer,UpdateGas1,UpdateGas2,UpdateGas3,UpdateGas4,UpdateGas5,UpdateGas6,UpdateGas7,UpdateGas8,UpdateGas9,UpdateGas10,UpdateGas11,UpdateGas12,UpdateGas13,CheckTerminate finalStyle
```

**执行步骤**:
1. **初始化**: 创建 BlockContext, TxContext, StateDB
2. **准备**: 根据交易类型创建 Contract 对象
3. **分配 Gas**: 扣除 gasLimit × gasPrice
4. **解释执行**: 循环读取操作码 → 检查 Gas → 执行 → 更新状态
5. **状态提交**: 成功则更新 StateDB，失败则回滚
6. **返回结果**: 返回值、Gas 使用量、错误信息

**EVM 优化**:
- **EIP-2929**: 冷/热访问 Gas 差异（冷2100，热100）
- **EIP-2200**: SSTORE Gas 退款机制
- **调用深度限制**: 最大1024层（防止栈溢出攻击）

---

## 如何查看图表

### 方法1: GitHub 在线查看（推荐）

直接在 GitHub 仓库中打开本 README.md 文件，所有 Mermaid 图表会自动渲染。

### 方法2: VS Code 插件

```bash
# 安装 Mermaid 插件
code --install-extension bierner.markdown-mermaid

# 在 VS Code 中打开本文件，使用 Markdown 预览即可
```

### 方法3: 在线编辑器

访问 [Mermaid Live Editor](https://mermaid.live/)，复制对应的 `.mmd` 文件内容即可实时编辑和预览。

### 方法4: 生成 SVG/PNG 图片

```bash
# 安装 mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# 生成 SVG
mmdc -i architecture.mmd -o architecture.svg
mmdc -i transaction-lifecycle.mmd -o transaction-lifecycle.svg
# ... 对所有 .mmd 文件执行
```

---

## 源文件列表

所有图表的 Mermaid 源码也保存为独立的 `.mmd` 文件，便于编辑和版本控制：

- `architecture.mmd` - 五层架构图源码（75行）
- `transaction-lifecycle.mmd` - 交易生命周期源码（78行）
- `state-storage.mmd` - 状态存储模型源码（69行）
- `sync-protocol.mmd` - Snap Sync 流程源码（69行）
- `evm-execution.mmd` - EVM 执行流程源码（142行）

---

## 相关文档

- 理论分析: [docs/01-theoretical-analysis.md](../docs/01-theoretical-analysis.md)
- 架构设计: [docs/02-architecture-design.md](../docs/02-architecture-design.md)
- 实践验证: [docs/03-practical-verification.md](../docs/03-practical-verification.md)

---

**最后更新**: 2024年11月
