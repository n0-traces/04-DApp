// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Counter - 简单计数器合约
/// @author
/// @notice 一个用于部署测试的计数器合约，包含增、减、设置、重置、事件和所有者控制
contract Counter {
    /// @notice 当前计数值
    uint256 public count;

    /// @notice 合约拥有者（部署者）
    address public owner;

    /// @notice 当计数变化时发出事件
    /// @param who 发出调用的地址
    /// @param oldValue 变更前的值
    /// @param newValue 变更后的值
    /// @param action 描述动作（"increment","decrement","set","reset","add","sub"）
    event CountChanged(address indexed who, uint256 oldValue, uint256 newValue, string action);

    /// @notice 仅限合约拥有者调用
    modifier onlyOwner() {
        require(msg.sender == owner, "Counter: caller is not the owner");
        _;
    }

    /// @notice 构造时设置合约拥有者，并把计数初始化为0（可选传初始值）
    /// @param _initial 可选的初始值（传0 则为 0）
    constructor(uint256 _initial) {
        owner = msg.sender;
        count = _initial;
        emit CountChanged(msg.sender, 0, _initial, "init");
    }

    /// @notice 增 1
    function increment() external returns (uint256) {
        uint256 old = count;
        count += 1;
        emit CountChanged(msg.sender, old, count, "increment");
        return count;
    }

    /// @notice 由 owner 设置计数为指定值
    /// @param _value 新值
    function set(uint256 _value) external onlyOwner {
        uint256 old = count;
        count = _value;
        emit CountChanged(msg.sender, old, count, "set");
    }

    /// @notice 由 owner 重置为 0
    function reset() external onlyOwner {
        uint256 old = count;
        count = 0;
        emit CountChanged(msg.sender, old, 0, "reset");
    }

    /// @notice 返回当前计数
    function getCount() external view returns (uint256) {
        return count;
    }
}
