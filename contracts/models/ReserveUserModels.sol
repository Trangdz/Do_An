// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Các struct lưu trữ chính cho LendHub v2 (Aave-Lite demo)
library ReserveUserModels {
    struct Position {
        uint128 principal; // số gốc tính theo 1e18 (đã normalize decimals)
        uint128 index;     // snapshot index (RAY) tại thời điểm cập nhật
    }

    struct UserReserveData {
        Position supply;          // deposit của user
        Position borrow;          // nợ của user
        bool     useAsCollateral; // bật/tắt dùng làm tài sản thế chấp
    }

    struct ReserveData {
        // Sổ cái
        uint128 reserveCash;           // tiền mặt sẵn (normalized 1e18)
        uint128 totalDebtPrincipal;    // tổng nợ gốc (tham khảo; DebtNow phản ánh qua index)

        // Index lũy kế (RAY)
        uint128 liquidityIndex;        // index cho người gửi
        uint128 variableBorrowIndex;   // index cho người vay

        // Lãi tức thời (RAY/second)
        uint64  liquidityRateRayPerSec;
        uint64  variableBorrowRateRayPerSec;

        // Cấu hình rủi ro
        uint16  reserveFactorBps;  // % lãi về treasury (0..10000)
        uint16  ltvBps;            // LTV
        uint16  liqThresholdBps;   // ngưỡng thanh lý
        uint16  liqBonusBps;       // thưởng thanh lý
        uint16  closeFactorBps;    // % nợ tối đa thanh lý/lần
        uint8   decimals;          // decimals thật của token
        bool    isBorrowable;      // có cho vay token này không

        // Lãi suất 2-slope params
        uint16  optimalUBps;           // U* (0..10000)
        uint64  baseRateRayPerSec;
        uint64  slope1RayPerSec;
        uint64  slope2RayPerSec;

        uint40  lastUpdate;            // block.timestamp lần accrue cuối
    }
}

