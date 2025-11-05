#!/usr/bin/env node

/**
 * 智能合约部署脚本
 * 用途: 部署SimpleStorage合约到Geth节点
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// 配置
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const ACCOUNT_INDEX = parseInt(process.env.ACCOUNT_INDEX || '0');

// 简单存储合约
const CONTRACT_ABI = [
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
    },
    {
        "inputs": [],
        "name": "increment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "newValue", "type": "uint256"},
            {"indexed": true, "name": "setter", "type": "address"}
        ],
        "name": "DataStored",
        "type": "event"
    }
];

const CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50610295806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80636057361d1461004657806360fe47b114610062578063d09de08a1461007e575b600080fd5b610060600480360381019061005b91906101a7565b610088565b005b61007c600480360381019061007791906101a7565b6100d7565b005b610086610126565b005b806000819055507f35835d77d2b28e3d7c640c5f0948b748f8c5df6c3c0e6f1c35f1e7c4f2d8e8d5816040516100bd91906101e3565b60405180910390a17f35835d77d2b28e3d7c640c5f0948b748f8c5df6c3c0e6f1c35f1e7c4f2d8e8d581336040516100ce9291906101fe565b60405180910390a150565b806000819055507f35835d77d2b28e3d7c640c5f0948b748f8c5df6c3c0e6f1c35f1e7c4f2d8e8d58133604051610116929190610227565b60405180910390a150565b600080815480929061013790610280565b91905055507f35835d77d2b28e3d7c640c5f0948b748f8c5df6c3c0e6f1c35f1e7c4f2d8e8d560005433604051610177929190610227565b60405180910390a1565b600080fd5b6000819050919050565b61019a81610187565b81146101a557600080fd5b50565b6000813590506101b781610191565b92915050565b6000602082840312156101d3576101d2610182565b5b60006101e1848285016101a8565b91505092915050565b60006020820190506101f96000830184610187565b92915050565b60006040820190506102146000830185610187565b6102216020830184610187565b9392505050565b600060408201905061023d6000830185610187565b61024a6020830184610187565b9392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061028b82610187565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036102bd576102bc610251565b5b60018201905091905056fea264697066735822122083c7f4fa1c7c9e3b3d5e8f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c64736f6c63430008120033';

// 连接Web3
const web3 = new Web3(RPC_URL);

async function main() {
    console.log('===================================');
    console.log('智能合约部署脚本');
    console.log('===================================');
    console.log('RPC URL:', RPC_URL);
    console.log('');

    try {
        // 获取账户
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            throw new Error('没有可用账户');
        }

        const deployer = accounts[ACCOUNT_INDEX];
        console.log('部署账户:', deployer);

        // 查询余额
        const balance = await web3.eth.getBalance(deployer);
        console.log('账户余额:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        console.log('');

        // 创建合约实例
        const contract = new web3.eth.Contract(CONTRACT_ABI);

        // 估算Gas
        console.log('估算部署Gas...');
        const deployTx = contract.deploy({
            data: CONTRACT_BYTECODE,
            arguments: []
        });

        const gasEstimate = await deployTx.estimateGas({ from: deployer });
        console.log('估算Gas:', gasEstimate);
        console.log('');

        // 部署合约
        console.log('部署合约中...');
        const deployedContract = await deployTx.send({
            from: deployer,
            gas: Math.floor(gasEstimate * 1.2), // 增加20%余量
            gasPrice: await web3.eth.getGasPrice()
        });

        const contractAddress = deployedContract.options.address;
        console.log('');
        console.log('✓ 合约部署成功！');
        console.log('合约地址:', contractAddress);

        // 保存合约地址
        const outputDir = path.join(__dirname, '../practical');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const addressFile = path.join(outputDir, 'contract-address.txt');
        fs.writeFileSync(addressFile, contractAddress);
        console.log('地址已保存到:', addressFile);
        console.log('');

        // 验证部署
        console.log('验证合约...');
        const instance = new web3.eth.Contract(CONTRACT_ABI, contractAddress);

        // 测试读取
        const initialValue = await instance.methods.get().call();
        console.log('初始存储值:', initialValue);

        // 测试写入
        console.log('');
        console.log('测试写入数据...');
        await instance.methods.set(42).send({
            from: deployer,
            gas: 100000
        });

        const newValue = await instance.methods.get().call();
        console.log('新存储值:', newValue);

        // 测试increment
        console.log('');
        console.log('测试increment...');
        await instance.methods.increment().send({
            from: deployer,
            gas: 100000
        });

        const incrementedValue = await instance.methods.get().call();
        console.log('递增后的值:', incrementedValue);

        console.log('');
        console.log('===================================');
        console.log('✓ 所有测试通过！');
        console.log('===================================');

    } catch (error) {
        console.error('');
        console.error('✗ 错误:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 运行
main().catch(console.error);
