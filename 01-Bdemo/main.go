package main

import (
	"Bdemo/contract"
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
)

/**
 * 任务1:区块链读写
* 	1：环境搭建
* 	2：连接测试网，查询指定区块，输出 哈希，时间戳，交易数量
*   3: 进行一次eth转账，并输出交易哈希
*/
var apiKey = getMyConfigByEnv("API_KEY")
var client, _ = ethclient.Dial(`https://sepolia.infura.io/v3/` + apiKey)

// f001 查询指定区块，输出 哈希，时间戳，交易数量
func f001() {
	block, err := client.BlockByNumber(context.Background(), big.NewInt(9445901))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Block number:", block.Number().Uint64())                                       // 9445901
	fmt.Println("Block time:", time.Unix(int64(block.Time()), 0).Format("2006-01-02 15:04:05")) // 2025-10-19 23:03:24
	fmt.Println("Bolck hash:", block.Hash().Hex())                                              // 0xc45f9c3fa2916032a77f490cdbdac9f16c60a7955fe26ca77bd05b7b161077f2
	fmt.Println("Block trans length:", len(block.Transactions()))                               // 115
}

// f002 进行一次eth转账，并输出交易哈希
func f002() {
	privateKey, err := crypto.HexToECDSA(getMyConfigByEnv("PRIVATE_KEY1"))
	if err != nil {
		log.Fatal("私钥格式错误:", err)
	}
	// 获取公钥地址
	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
	fmt.Println("发送方地址:", fromAddress.Hex())
	// 获取nonce（发送计数），这里必须从链上获取，否则会错乱
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Fatal("获取 nonce 失败:", err)
	}
	fmt.Println("当前 nonce:", nonce)
	// 接受方的公钥
	toAddress := common.HexToAddress(getMyConfigByEnv("PUBLIC_KEY2"))
	// 转账金额（0.01eth）
	value := big.NewInt(1 * 1e16)

	// 获取 gas 价格
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatal("获取 gas price 失败:", err)
	}
	// 转账 ETH 的标准 gas 限额
	msg := ethereum.CallMsg{
		From:     fromAddress,
		To:       &toAddress,
		GasPrice: gasPrice,
		Value:    value,
		Data:     nil, // 普通转账无data
	}
	gasLimit, err := client.EstimateGas(context.Background(), msg)
	if err != nil {
		gasLimit = uint64(23000) // 如果估算失败，则使用默认值23000
	}
	fmt.Println("估算的Gas:", gasLimit)
	// 创建交易
	tx := types.NewTx(&types.LegacyTx{Nonce: nonce, To: &toAddress, Value: value, Gas: gasLimit, GasPrice: gasPrice})
	// 获取链ID
	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Fatal("获取 chainID 失败:", err)
	}
	// 进行交易签名
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		log.Fatal("签名交易失败:", err)
	}
	// 发送交易
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatal("发送交易失败:", err)
	}

	fmt.Printf("交易已广播成功!\nTx Hash: %s\n", signedTx.Hash().Hex())
}

// f003 部署合约
func f003() {
	// 编写的合约见 contract/Counter.sol
	// 生成go绑定，安装solc和abigen后，可直接执行 contract/deploy.sh
	// 先部署合约
	privateKey, err := crypto.HexToECDSA(getMyConfigByEnv("PRIVATE_KEY2"))
	if err != nil {
		log.Fatal("加载私钥失败:", err)
	}
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("cannot assert type: publicKey is not of type *ecdsa.PublicKey")
	}
	// 获取部署者地址
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	// 获取交易计数
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	// 获取gas价格
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatal("获取gas价格失败:", err)
	}
	// 获取链ID
	chainId, err := client.NetworkID(context.Background())
	if err != nil {
		log.Fatal("获取链ID失败:", err)
	}
	// 创建交易对象
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainId)
	if err != nil {
		log.Fatal("创建交易对象失败:", err)
	}
	// 计算合适的gas limit
	bin := contract.ContractMetaData.Bin
	callMsg := ethereum.CallMsg{
		From: fromAddress,
		Data: common.FromHex(bin),
	}
	gasLimit, err := client.EstimateGas(context.Background(), callMsg)
	if err != nil {
		log.Println("获取gas limit失败:", err)
		gasLimit = uint64(600000)
	}
	auth.Nonce = big.NewInt(int64(nonce))
	// 为了防止部署时，缺少gas失败，增加缓冲
	auth.GasPrice = gasPrice
	auth.GasLimit = uint64(float64(gasLimit) * 1.1)
	fmt.Println("gasPrice:", auth.GasPrice, "gasLimit:", auth.GasLimit)
	// 部署合约
	address, tx, _, err := contract.DeployContract(auth, client, big.NewInt(0))
	if err != nil {
		log.Fatal("部署合约失败:", err)
	}
	fmt.Println("合约部署中，地址:", address.Hex())
	fmt.Println("部署交易哈希:", tx.Hash().Hex())
	bind.WaitMined(context.Background(), client, tx)
	fmt.Println("合约部署完成!")
}

// f004 执行合约
func f004() {
	privateKey, err := crypto.HexToECDSA(getMyConfigByEnv("PRIVATE_KEY2"))
	if err != nil {
		log.Fatal("加载私钥失败:", err)
	}
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("cannot assert type: publicKey is not of type *ecdsa.PublicKey")
	}
	// 获取部署者地址
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	// 获取链ID
	chainId, err := client.NetworkID(context.Background())
	// 这里要替换为部署成功的合约地址
	instance, err := contract.NewContract(common.HexToAddress("0x1C0440541b9ca36F576D66D0C80eFE9FE76D3cc2"),client) 
	if err != nil {
		log.Fatal("实例化合约失败:", err)
	}
	count, err := instance.GetCount(nil)
	if err != nil {
		log.Fatal("获取合约计数失败:", err)
	}
	fmt.Println("合约初始计数:", count) // 0
	// 重新构造简易签名
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Fatal("获取 nonce 失败:", err)
	}
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatal("获取 gasPrice 失败:", err)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainId)
	if err != nil {
		log.Fatal("创建交易签名器失败:", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = uint64(300000)
	auth.GasPrice = gasPrice
	tx, err := instance.Increment(auth) // 调用合约自增方法
	if err != nil {
		log.Fatal("调用合约方法失败:", err)
	}
	fmt.Println("调用合约方法交易哈希:", tx.Hash().Hex())
	bind.WaitMined(context.Background(), client, tx) // 等待交易完成
	count, err = instance.GetCount(nil)              // 再次读取合约计数
	if err != nil {
		log.Fatal("获取合约计数失败:", err)
	}
	fmt.Println("第二次合约计数:", count) // 1
}

func getMyConfigByEnv(str string) string {
	// 注意私钥保护
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}
	value := os.Getenv(str)
	fmt.Printf("获取配置：key=%s \n \t\t value=%s \n", str, value)
	return value
}

func main() {
	//f001() // 查询指定区块，输出 哈希，时间戳，交易数量
	//f002() // 进行一次eth转账，并输出交易哈希
	//f003() // 部署合约
	f004() // 执行合约
}
