#!/bin/bash

# 编译合约
solc --bin Counter.sol -o ./build/
# 生成合约ABI
solc --abi Counter.sol -o ./build/
#
abigen --abi ./build/Counter.abi --bin ./build/Counter.bin --pkg contract --out ./counter.go