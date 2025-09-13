pragma solidity ^0.8.20;

library LendingMath{
    //Dùng có các phép tính với token chuẩn ERC20 có 18 chữ số thập phân
    uint256 internal constant WAD = 1e18;
    //Dùng cho các phép tính lãi xuất với độ chính xác cao
    uint256 internal constant RAY = 1e27;

    // Định nghĩa phép nhân chia với WAD và RAY
    function  wadMul(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * b) / WAD;
    }

    function  wadDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * WAD) / b;
    }

    function  rayMul(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * b) / RAY;
    }
    function  rayDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * RAY) / b;
    }


    //Hàm tính lãi suất theo công thức lãi kép
    function accrueIndex(uint256 indexRay,uint256 rateRayPerSec,uint256 dt) internal pure returns (uint256){
       //indexRay: chỉ số vay hiện tại
       //rateRayPerSec: lãi suất theo giây
      //dt: khoảng thời gian tính lãi
      //1.1 = 1.0 × (1 + lãi_suất × thời_gian)
      //ban đầu indexRay = RAY
      uint256 growth=RAY+rateRayPerSec*dt;
      return rayMul(indexRay, growth);
      
    }

    
    /// utilization = debtNow / (cash + debtNow), trả về WAD (1e18)
    function utilization(uint256 cash, uint256 debtNow) internal pure returns (uint256 uWad) {
        if (debtNow == 0) return 0;
        uint256 denom = cash + debtNow;
        if (denom == 0) return 0;
        return (debtNow * WAD) / denom;
    }
    //Tính giá trị hiện tại của một khoản tiền dựa trên chỉ số tích lũy lãi.
    /// convert principal theo index (RAY)
    function valueByIndex(uint256 principal, uint256 indexNowRay, uint256 indexSnapRay) internal pure returns (uint256) {
        if (principal == 0) return 0;
        return (principal * indexNowRay) / indexSnapRay;
    }
//    principal: Số tiền gốc ban đầu

// indexNowRay: Chỉ số tích lũy hiện tại

// indexSnapRay: Chỉ số tích lũy tại thời điểm gửi/vay
}