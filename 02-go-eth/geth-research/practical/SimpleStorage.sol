// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleStorage
 * @dev 简单的数据存储合约，用于演示Geth交互
 */
contract SimpleStorage {
    // 存储的数据
    uint256 private storedData;

    // 事件: 当数据被更新时触发
    event DataStored(uint256 indexed newValue, address indexed setter);

    /**
     * @dev 设置存储的数据
     * @param x 要存储的值
     */
    function set(uint256 x) public {
        storedData = x;
        emit DataStored(x, msg.sender);
    }

    /**
     * @dev 获取存储的数据
     * @return 当前存储的值
     */
    function get() public view returns (uint256) {
        return storedData;
    }

    /**
     * @dev 递增存储的数据
     */
    function increment() public {
        storedData += 1;
        emit DataStored(storedData, msg.sender);
    }
}
