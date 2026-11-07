// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ObraClaraPartialEscrow} from "../src/ObraClaraPartialEscrow.sol";
import {LocalSimulationERC20} from "../src/LocalSimulationERC20.sol";
import {SafeERC20} from "../src/SafeERC20.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
    function addr(uint256) external returns (address);
}

contract ApproveHarness {
    function forceApprove(address token, address spender, uint256 amount) external {
        SafeERC20.forceApprove(token, spender, amount);
    }
}

contract NoDecimalsToken {
    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }
}

/// @notice Local EVM tests. The token is SIM-LOCAL, not official USDT and not Fuji.
contract ObraClaraPartialEscrowTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    LocalSimulationERC20 internal token;
    ObraClaraPartialEscrow internal escrow;
    address internal buyer;
    address internal seller;
    address internal employee;
    address internal stranger;

    uint256 internal constant QTY = 100;
    uint256 internal constant PRICE = 50_000;
    uint256 internal constant TOTAL = 5_000_000;

    function setUp() public {
        buyer = vm.addr(1);
        seller = vm.addr(2);
        employee = vm.addr(3);
        stranger = vm.addr(4);
        token = new LocalSimulationERC20(6);
        escrow = new ObraClaraPartialEscrow(address(token), 6, block.chainid);
        token.mint(buyer, 50_000_000);
        vm.prank(buyer);
        token.approve(address(escrow), type(uint256).max);
    }

    function _deadline() internal view returns (uint64) {
        return uint64(block.timestamp + 7 days);
    }

    function _fund(bytes32 id, uint64 deadline) internal {
        vm.prank(buyer);
        escrow.fund(id, seller, QTY, PRICE, TOTAL, deadline, address(token));
    }

    function _authorize(bytes32 id) internal {
        vm.prank(buyer);
        escrow.authorizeDelegate(id, employee);
    }

    function testConstructorReadsDecimalsAndChain() public {
        assertEq(escrow.token(), address(token));
        assertEq(uint256(escrow.tokenDecimals()), 6);
        assertEq(escrow.chainId(), block.chainid);
    }

    function testConstructorRejectsWrongChainWrongDecimalsAndMissingDecimals() public {
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.WrongChain.selector, block.chainid, uint256(43113)));
        new ObraClaraPartialEscrow(address(token), 6, 43113);

        LocalSimulationERC20 other = new LocalSimulationERC20(18);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.DecimalsMismatch.selector, uint8(18), uint8(6)));
        new ObraClaraPartialEscrow(address(other), 6, block.chainid);

        vm.expectRevert(SafeERC20.TokenRejected.selector);
        new ObraClaraPartialEscrow(address(new NoDecimalsToken()), 6, block.chainid);

        vm.expectRevert(ObraClaraPartialEscrow.ZeroAddress.selector);
        new ObraClaraPartialEscrow(address(0), 6, block.chainid);
    }

    function testWrongAssetDuplicateAndBadTerms() public {
        LocalSimulationERC20 other = new LocalSimulationERC20(6);
        vm.startPrank(buyer);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.WrongAsset.selector, address(other)));
        escrow.fund(bytes32(uint256(1)), seller, QTY, PRICE, TOTAL, _deadline(), address(other));

        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.AmountMismatch.selector, TOTAL, TOTAL - 1));
        escrow.fund(bytes32(uint256(1)), seller, QTY, PRICE, TOTAL - 1, _deadline(), address(token));

        vm.expectRevert(ObraClaraPartialEscrow.InvalidTerms.selector);
        escrow.fund(bytes32(uint256(1)), seller, 0, PRICE, 0, _deadline(), address(token));

        vm.expectRevert(ObraClaraPartialEscrow.InvalidParty.selector);
        escrow.fund(bytes32(uint256(1)), buyer, QTY, PRICE, TOTAL, _deadline(), address(token));

        vm.expectRevert(ObraClaraPartialEscrow.InvalidDeadline.selector);
        escrow.fund(bytes32(uint256(1)), seller, QTY, PRICE, TOTAL, uint64(block.timestamp), address(token));

        escrow.fund(bytes32(uint256(1)), seller, QTY, PRICE, TOTAL, _deadline(), address(token));
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.Duplicate.selector, bytes32(uint256(1))));
        escrow.fund(bytes32(uint256(1)), seller, QTY, PRICE, TOTAL, _deadline(), address(token));
        vm.stopPrank();
    }

    function testUnauthorizedReleaseAndNoDelegate() public {
        bytes32 id = bytes32(uint256(2));
        _fund(id, _deadline());
        vm.prank(employee);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.Unauthorized.selector, employee));
        escrow.settle(id, 80);

        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.Unauthorized.selector, seller));
        escrow.settle(id, 80);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.Unauthorized.selector, buyer));
        escrow.settle(id, 100);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.Unauthorized.selector, stranger));
        escrow.authorizeDelegate(id, employee);

        vm.prank(buyer);
        vm.expectRevert(ObraClaraPartialEscrow.InvalidParty.selector);
        escrow.authorizeDelegate(id, seller);
    }

    function testPartialEightyIsAtomicAndCloses() public {
        bytes32 id = bytes32(uint256(80));
        uint64 deadline = _deadline();
        _fund(id, deadline);
        _authorize(id);
        uint256 sellerBefore = token.balanceOf(seller);
        uint256 buyerBefore = token.balanceOf(buyer);
        vm.prank(employee);
        escrow.settle(id, 80);
        assertEq(token.balanceOf(seller) - sellerBefore, 4_000_000);
        assertEq(token.balanceOf(buyer) - buyerBefore, 1_000_000);
        assertEq(token.balanceOf(address(escrow)), 0);
        ObraClaraPartialEscrow.Order memory stored = escrow.order(id);
        assertEq(uint256(stored.status), 2);
        assertEq(stored.received, 80);
        vm.prank(employee);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.NotFunded.selector, id));
        escrow.settle(id, 80);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.NotFunded.selector, id));
        escrow.refundExpired(id);
    }

    function testZeroAndFullReceipt() public {
        bytes32 noneId = bytes32(uint256(10));
        bytes32 fullId = bytes32(uint256(11));
        _fund(noneId, _deadline());
        _fund(fullId, _deadline());
        _authorize(noneId);
        _authorize(fullId);
        uint256 sellerBefore = token.balanceOf(seller);
        uint256 buyerBefore = token.balanceOf(buyer);
        vm.prank(employee);
        escrow.settle(noneId, 0);
        assertEq(token.balanceOf(seller), sellerBefore);
        assertEq(token.balanceOf(buyer) - buyerBefore, TOTAL);
        vm.prank(employee);
        escrow.settle(fullId, 100);
        assertEq(token.balanceOf(seller) - sellerBefore, TOTAL);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testOverQuantityAndPreviewRounding() public {
        bytes32 id = bytes32(uint256(12));
        _fund(id, _deadline());
        _authorize(id);
        vm.prank(employee);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.QuantityOutOfRange.selector, uint256(101), QTY));
        escrow.settle(id, 101);
        (uint256 sellerAmount, uint256 buyerRefund) = escrow.preview(100, 3, 1);
        assertEq(sellerAmount, 33);
        assertEq(buyerRefund, 67);
        assertEq(sellerAmount + buyerRefund, 100);
    }

    function testExpiryRace() public {
        bytes32 early = bytes32(uint256(20));
        bytes32 late = bytes32(uint256(21));
        uint64 deadline = uint64(block.timestamp + 100);
        _fund(early, deadline);
        _fund(late, deadline);
        _authorize(early);
        vm.warp(deadline);
        vm.prank(employee);
        escrow.settle(early, 80);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.TooEarly.selector, late));
        escrow.refundExpired(late);
        vm.warp(deadline + 1);
        vm.prank(employee);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.Expired.selector, late));
        escrow.settle(late, 80);
        uint256 buyerBefore = token.balanceOf(buyer);
        escrow.refundExpired(late);
        assertEq(token.balanceOf(buyer) - buyerBefore, TOTAL);
        assertEq(uint256(escrow.order(late).status), 3);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.NotFunded.selector, late));
        escrow.refundExpired(late);
    }

    function testPrematureRefundReverts() public {
        bytes32 id = bytes32(uint256(22));
        _fund(id, _deadline());
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.TooEarly.selector, id));
        escrow.refundExpired(id);
        assertEq(token.balanceOf(address(escrow)), TOTAL);
    }

    function testFeeFalseSilentAndReentrancy() public {
        LocalSimulationERC20 fee = new LocalSimulationERC20(6);
        fee.setFeeBps(100);
        ObraClaraPartialEscrow feeEscrow = new ObraClaraPartialEscrow(address(fee), 6, block.chainid);
        fee.mint(buyer, TOTAL);
        vm.startPrank(buyer);
        fee.approve(address(feeEscrow), TOTAL);
        vm.expectRevert(abi.encodeWithSelector(ObraClaraPartialEscrow.ShortTransfer.selector, TOTAL, TOTAL - TOTAL / 100));
        feeEscrow.fund(bytes32(uint256(30)), seller, QTY, PRICE, TOTAL, _deadline(), address(fee));
        vm.stopPrank();

        LocalSimulationERC20 liar = new LocalSimulationERC20(6);
        liar.setFalseReturn(true);
        ObraClaraPartialEscrow liarEscrow = new ObraClaraPartialEscrow(address(liar), 6, block.chainid);
        liar.mint(buyer, TOTAL);
        vm.startPrank(buyer);
        liar.approve(address(liarEscrow), TOTAL);
        vm.expectRevert(SafeERC20.TokenRejected.selector);
        liarEscrow.fund(bytes32(uint256(33)), seller, QTY, PRICE, TOTAL, _deadline(), address(liar));
        vm.stopPrank();

        LocalSimulationERC20 silent = new LocalSimulationERC20(6);
        silent.setSilentReturn(true);
        ObraClaraPartialEscrow silentEscrow = new ObraClaraPartialEscrow(address(silent), 6, block.chainid);
        silent.mint(buyer, TOTAL);
        vm.prank(buyer);
        (bool approved,) = address(silent).call(abi.encodeWithSelector(silent.approve.selector, address(silentEscrow), TOTAL));
        require(approved, "silent approve");
        vm.prank(buyer);
        silentEscrow.fund(bytes32(uint256(31)), seller, QTY, PRICE, TOTAL, _deadline(), address(silent));
        assertEq(silent.balanceOf(address(silentEscrow)), TOTAL);

        LocalSimulationERC20 trap = new LocalSimulationERC20(6);
        ObraClaraPartialEscrow trapEscrow = new ObraClaraPartialEscrow(address(trap), 6, block.chainid);
        trap.mint(buyer, TOTAL * 2);
        vm.prank(buyer);
        trap.approve(address(trapEscrow), type(uint256).max);
        trap.setReenter(
            address(trapEscrow),
            abi.encodeWithSelector(
                trapEscrow.fund.selector,
                bytes32(uint256(99)),
                seller,
                QTY,
                PRICE,
                TOTAL,
                _deadline(),
                address(trap)
            ),
            false
        );
        vm.prank(buyer);
        trapEscrow.fund(bytes32(uint256(32)), seller, QTY, PRICE, TOTAL, _deadline(), address(trap));
        assertFalse(trap.reenterSucceeded());
        assertEq(uint256(trapEscrow.order(bytes32(uint256(99))).status), 0);
        assertEq(uint256(trapEscrow.order(bytes32(uint256(32))).status), 1);
    }

    function testSettleReentrancyCannotDoublePay() public {
        LocalSimulationERC20 trap = new LocalSimulationERC20(6);
        ObraClaraPartialEscrow trapEscrow = new ObraClaraPartialEscrow(address(trap), 6, block.chainid);
        trap.mint(buyer, TOTAL);
        vm.prank(buyer);
        trap.approve(address(trapEscrow), TOTAL);
        vm.prank(buyer);
        trapEscrow.fund(bytes32(uint256(40)), seller, QTY, PRICE, TOTAL, _deadline(), address(trap));
        vm.prank(buyer);
        trapEscrow.authorizeDelegate(bytes32(uint256(40)), employee);
        trap.setReenter(
            address(trapEscrow),
            abi.encodeWithSelector(trapEscrow.settle.selector, bytes32(uint256(40)), uint256(100)),
            false
        );
        vm.prank(employee);
        trapEscrow.settle(bytes32(uint256(40)), 80);
        assertFalse(trap.reenterSucceeded());
        assertEq(trap.balanceOf(seller), 4_000_000);
        assertEq(trap.balanceOf(buyer), 1_000_000);
        assertEq(trap.balanceOf(address(trapEscrow)), 0);
    }

    function testForceApproveResetsUsdtStyleAllowance() public {
        LocalSimulationERC20 usdtLike = new LocalSimulationERC20(6);
        usdtLike.setUsdtApprove(true);
        ApproveHarness harness = new ApproveHarness();
        usdtLike.mint(address(harness), 10);
        vm.prank(address(harness));
        usdtLike.approve(address(escrow), 1);
        vm.prank(address(harness));
        vm.expectRevert();
        usdtLike.approve(address(escrow), 5);
        harness.forceApprove(address(usdtLike), address(escrow), 5);
        assertEq(usdtLike.allowance(address(harness), address(escrow)), 5);
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "address");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "uint");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "expected false");
    }
}
