// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal SafeERC20 for tokens that omit a boolean return value,
/// return false, or reject a non-zero allowance change until it is reset.
/// USDT on Ethereum behaves like that. Fuji USDT is not confirmed; the
/// escrow still refuses to assume a fully standard ERC-20.
library SafeERC20 {
    error TokenRejected();

    function safeTransfer(address token, address to, uint256 amount) internal {
        _call(token, abi.encodeWithSelector(0xa9059cbb, to, amount));
    }

    function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        _call(token, abi.encodeWithSelector(0x23b872dd, from, to, amount));
    }

    function safeBalanceOf(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x70a08231, account));
        if (!ok || data.length < 32) revert TokenRejected();
        return abi.decode(data, (uint256));
    }

    function safeDecimals(address token) internal view returns (uint8) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x313ce567));
        if (!ok || data.length < 32) revert TokenRejected();
        uint256 value = abi.decode(data, (uint256));
        if (value > 18) revert TokenRejected();
        return uint8(value);
    }

    /// @dev Sets an exact allowance. If the token reverts or returns false while a
    /// previous allowance is open, it first approves zero and then the new value.
    function forceApprove(address token, address spender, uint256 amount) internal {
        if (_tryApprove(token, spender, amount)) return;
        if (!_tryApprove(token, spender, 0) || !_tryApprove(token, spender, amount)) revert TokenRejected();
    }

    function _tryApprove(address token, address spender, uint256 amount) private returns (bool) {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, spender, amount));
        return ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (bool))));
    }

    function _call(address token, bytes memory data) private {
        (bool ok, bytes memory ret) = token.call(data);
        if (!ok || (ret.length != 0 && (ret.length < 32 || !abi.decode(ret, (bool))))) revert TokenRejected();
    }
}
