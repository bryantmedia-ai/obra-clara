// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SafeERC20} from "./SafeERC20.sol";

/// @title ObraClaraPartialEscrow
/// @notice One purchase, one locked amount, one final settlement.
/// The accepted token is fixed at deployment. A caller cannot substitute another
/// token and have it treated as the order's funds. Each order freezes seller,
/// quantity, unit price, amount, deadline and buyer. Settlement pays the seller
/// floor(amount * received / quantity) and returns the rest to the buyer in the
/// same transaction, then closes the order. There is no leftover open balance.
///
/// Time rules, using the chain clock:
/// - settlement is allowed while block.timestamp <= deadline
/// - a full refund is allowed only when block.timestamp > deadline and the order
///   is still funded
/// The two windows do not overlap. The first successful call closes the order.
contract ObraClaraPartialEscrow {
    uint8 private constant NONE = 0;
    uint8 private constant FUNDED = 1;
    uint8 private constant SETTLED = 2;
    uint8 private constant REFUNDED = 3;

    address public immutable token;
    uint8 public immutable tokenDecimals;
    uint256 public immutable chainId;

    struct Order {
        address buyer;
        address seller;
        address delegate;
        uint256 amount;
        uint256 quantity;
        uint256 unitPrice;
        uint64 deadline;
        uint256 received;
        uint8 status;
    }

    mapping(bytes32 => Order) private _orders;
    uint256 private _lock;

    error ZeroAddress();
    error WrongChain(uint256 actual, uint256 expected);
    error DecimalsMismatch(uint8 found, uint8 expected);
    error WrongAsset(address asset);
    error Duplicate(bytes32 orderId);
    error InvalidTerms();
    error InvalidParty();
    error InvalidDeadline();
    error NotFunded(bytes32 orderId);
    error Unauthorized(address caller);
    error Expired(bytes32 orderId);
    error TooEarly(bytes32 orderId);
    error QuantityOutOfRange(uint256 received, uint256 quantity);
    error AmountMismatch(uint256 expected, uint256 given);
    error ShortTransfer(uint256 expected, uint256 actual);
    error Reentrancy();

    event OrderFunded(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 quantity,
        uint256 unitPrice,
        uint64 deadline
    );
    event DelegateAuthorized(bytes32 indexed orderId, address indexed buyer, address indexed delegate);
    event OrderSettled(
        bytes32 indexed orderId,
        address indexed delegate,
        uint256 received,
        uint256 sellerAmount,
        uint256 buyerRefund
    );
    event OrderRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);

    modifier nonReentrant() {
        if (_lock == 1) revert Reentrancy();
        _lock = 1;
        _;
        _lock = 0;
    }

    constructor(address token_, uint8 expectedDecimals_, uint256 chainId_) {
        if (token_ == address(0)) revert ZeroAddress();
        if (chainId_ != block.chainid) revert WrongChain(block.chainid, chainId_);
        uint8 found = SafeERC20.safeDecimals(token_);
        if (found != expectedDecimals_) revert DecimalsMismatch(found, expectedDecimals_);
        token = token_;
        tokenDecimals = found;
        chainId = chainId_;
    }

    function order(bytes32 orderId) external view returns (Order memory) {
        return _orders[orderId];
    }

    /// @dev Floor division for the seller. The buyer receives the remainder, so the
    /// two transfers always add up to the locked amount.
    function preview(uint256 amount, uint256 quantity, uint256 receivedQty)
        public
        pure
        returns (uint256 sellerAmount, uint256 buyerRefund)
    {
        if (quantity == 0 || receivedQty > quantity) revert QuantityOutOfRange(receivedQty, quantity);
        sellerAmount = amount * receivedQty / quantity;
        buyerRefund = amount - sellerAmount;
    }

    function fund(
        bytes32 orderId,
        address seller,
        uint256 quantity,
        uint256 unitPrice,
        uint256 amount,
        uint64 deadline,
        address asset
    ) external nonReentrant {
        if (orderId == bytes32(0)) revert InvalidTerms();
        if (_orders[orderId].status != NONE) revert Duplicate(orderId);
        if (asset != token) revert WrongAsset(asset);
        if (seller == address(0) || seller == msg.sender) revert InvalidParty();
        if (quantity == 0 || unitPrice == 0) revert InvalidTerms();
        uint256 expected = quantity * unitPrice;
        if (amount != expected) revert AmountMismatch(expected, amount);
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 beforeBalance = SafeERC20.safeBalanceOf(token, address(this));
        SafeERC20.safeTransferFrom(token, msg.sender, address(this), amount);
        uint256 receivedTokens = SafeERC20.safeBalanceOf(token, address(this)) - beforeBalance;
        if (receivedTokens != amount) revert ShortTransfer(amount, receivedTokens);

        _orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            delegate: address(0),
            amount: amount,
            quantity: quantity,
            unitPrice: unitPrice,
            deadline: deadline,
            received: 0,
            status: FUNDED
        });
        emit OrderFunded(orderId, msg.sender, seller, amount, quantity, unitPrice, deadline);
    }

    /// @notice Buyer authorizes one receiving wallet. A form or a QR code cannot do this.
    function authorizeDelegate(bytes32 orderId, address delegate_) external {
        Order storage item = _orders[orderId];
        if (item.status != FUNDED) revert NotFunded(orderId);
        if (msg.sender != item.buyer) revert Unauthorized(msg.sender);
        if (delegate_ == address(0) || delegate_ == item.seller) revert InvalidParty();
        item.delegate = delegate_;
        emit DelegateAuthorized(orderId, msg.sender, delegate_);
    }

    function settle(bytes32 orderId, uint256 receivedQty) external nonReentrant {
        Order storage item = _orders[orderId];
        if (item.status != FUNDED) revert NotFunded(orderId);
        if (block.timestamp > item.deadline) revert Expired(orderId);
        if (item.delegate == address(0) || msg.sender != item.delegate) revert Unauthorized(msg.sender);
        if (receivedQty > item.quantity) revert QuantityOutOfRange(receivedQty, item.quantity);

        (uint256 sellerAmount, uint256 buyerRefund) = preview(item.amount, item.quantity, receivedQty);
        address seller = item.seller;
        address buyer = item.buyer;
        item.received = receivedQty;
        item.status = SETTLED;

        if (sellerAmount != 0) SafeERC20.safeTransfer(token, seller, sellerAmount);
        if (buyerRefund != 0) SafeERC20.safeTransfer(token, buyer, buyerRefund);
        emit OrderSettled(orderId, msg.sender, receivedQty, sellerAmount, buyerRefund);
    }

    function refundExpired(bytes32 orderId) external nonReentrant {
        Order storage item = _orders[orderId];
        if (item.status != FUNDED) revert NotFunded(orderId);
        if (block.timestamp <= item.deadline) revert TooEarly(orderId);
        uint256 amount = item.amount;
        address buyer = item.buyer;
        item.status = REFUNDED;
        SafeERC20.safeTransfer(token, buyer, amount);
        emit OrderRefunded(orderId, buyer, amount);
    }
}
