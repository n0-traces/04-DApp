#!/usr/bin/env node

/**
 * 压力测试脚本
 * 用途: 测试Geth节点的交易处理能力
 */

const Web3 = require('web3');

// 配置
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const NUM_TXS = parseInt(process.env.NUM_TXS || '100');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10');

const web3 = new Web3(RPC_URL);

async function main() {
    console.log('===================================');
    console.log('Geth 压力测试');
    console.log('===================================');
    console.log('RPC URL:', RPC_URL);
    console.log('交易数量:', NUM_TXS);
    console.log('批次大小:', BATCH_SIZE);
    console.log('');

    try {
        // 获取账户
        const accounts = await web3.eth.getAccounts();
        if (accounts.length < 2) {
            throw new Error('需要至少2个账户进行测试');
        }

        const sender = accounts[0];
        const receiver = accounts[1];

        console.log('发送者:', sender);
        console.log('接收者:', receiver);

        // 查询余额
        const balance = await web3.eth.getBalance(sender);
        console.log('发送者余额:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        console.log('');

        // 获取初始nonce
        let nonce = await web3.eth.getTransactionCount(sender);
        console.log('初始nonce:', nonce);
        console.log('');

        // 开始测试
        console.log('开始发送交易...');
        const startTime = Date.now();
        const txHashes = [];

        // 分批发送
        const numBatches = Math.ceil(NUM_TXS / BATCH_SIZE);

        for (let batch = 0; batch < numBatches; batch++) {
            const batchStart = batch * BATCH_SIZE;
            const batchEnd = Math.min(batchStart + BATCH_SIZE, NUM_TXS);
            const batchSize = batchEnd - batchStart;

            const promises = [];

            for (let i = 0; i < batchSize; i++) {
                const promise = web3.eth.sendTransaction({
                    from: sender,
                    to: receiver,
                    value: web3.utils.toWei('0.001', 'ether'),
                    gas: 21000,
                    nonce: nonce++
                }).then(receipt => {
                    txHashes.push(receipt.transactionHash);
                    return receipt;
                });

                promises.push(promise);
            }

            // 等待当前批次完成
            await Promise.all(promises);
            console.log(`批次 ${batch + 1}/${numBatches} 完成 (${batchEnd}/${NUM_TXS} 交易)`);
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('');
        console.log('===================================');
        console.log('测试结果');
        console.log('===================================');
        console.log('总交易数:', NUM_TXS);
        console.log('总耗时:', duration.toFixed(2), '秒');
        console.log('平均TPS:', (NUM_TXS / duration).toFixed(2));
        console.log('平均延迟:', (duration / NUM_TXS * 1000).toFixed(2), 'ms');

        // 验证交易
        console.log('');
        console.log('验证交易状态...');
        let successCount = 0;
        let failCount = 0;

        for (const hash of txHashes) {
            const receipt = await web3.eth.getTransactionReceipt(hash);
            if (receipt && receipt.status) {
                successCount++;
            } else {
                failCount++;
            }
        }

        console.log('成功:', successCount);
        console.log('失败:', failCount);

        // 检查最终余额
        console.log('');
        console.log('最终余额:');
        const finalSenderBalance = await web3.eth.getBalance(sender);
        const finalReceiverBalance = await web3.eth.getBalance(receiver);
        console.log('发送者:', web3.utils.fromWei(finalSenderBalance, 'ether'), 'ETH');
        console.log('接收者:', web3.utils.fromWei(finalReceiverBalance, 'ether'), 'ETH');

        // 计算Gas消耗
        const balanceChange = BigInt(balance) - BigInt(finalSenderBalance);
        const expectedTransfer = BigInt(web3.utils.toWei((NUM_TXS * 0.001).toString(), 'ether'));
        const totalGasCost = balanceChange - expectedTransfer;
        console.log('');
        console.log('总Gas成本:', web3.utils.fromWei(totalGasCost.toString(), 'ether'), 'ETH');
        console.log('平均Gas成本:', web3.utils.fromWei((totalGasCost / BigInt(NUM_TXS)).toString(), 'ether'), 'ETH');

        console.log('');
        console.log('✓ 测试完成！');

    } catch (error) {
        console.error('');
        console.error('✗ 错误:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
