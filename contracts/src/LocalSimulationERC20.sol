// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Local test double. This is not Tether, not Circle and not a Fuji token.
/// Do not deploy it on Avalanche and do not label it as an official stablecoin.
contract LocalSimulationERC20 {
    string public constant name = "Simulacion local. No es USDT ni un token oficial.";
    string public constant symbol = "SIM-LOCAL";
    uint8 public immutable decimals;

    bool public silentReturn;
    bool public falseReturn;
    bool public usdtApprove;
    bool public bubbleReenter;
    uint256 public feeBps;
    address public reenterTarget;
    bytes public reenterData;
    bool public reenterSucceeded;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor(uint8 decimals_) {
        decimals = decimals_;
    }

    function setSilentReturn(bool value) external {
        silentReturn = value;
    }

    function setFalseReturn(bool value) external {
        falseReturn = value;
    }

    function setUsdtApprove(bool value) external {
        usdtApprove = value;
    }

    function setFeeBps(uint256 value) external {
        feeBps = value;
    }

    function setReenter(address target, bytes calldata data, bool bubble) external {
        reenterTarget = target;
        reenterData = data;
        bubbleReenter = bubble;
        reenterSucceeded = false;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (usdtApprove && allowance[msg.sender][spender] != 0 && amount != 0) revert("approve nonzero");
        allowance[msg.sender][spender] = amount;
        return _result();
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return _result();
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return _result();
    }

    function _move(address from, address to, uint256 amount) private {
        uint256 delivered = feeBps == 0 ? amount : amount - (amount * feeBps / 10_000);
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += delivered;
        totalSupply -= amount - delivered;
        if (reenterTarget != address(0)) {
            (bool ok,) = reenterTarget.call(reenterData);
            if (ok) reenterSucceeded = true;
            if (bubbleReenter && !ok) revert("reenter bubbled");
        }
    }

    function _result() private view returns (bool) {
        if (falseReturn) return false;
        if (silentReturn) {
            assembly {
                return(0, 0)
            }
        }
        return true;
    }
}
