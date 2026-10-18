import express from 'express';
import cors from 'cors';
import { CoreBridge } from '@modular-os/bridge';

const app = express();
const PORT = process.env.PORT || 4001;
const MODULE_ID = 'shop-module';
const MODULE_SECRET = process.env.MODULE_SECRET || 'secret_hash_cua_shop';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost/api/core';

app.use(cors());
app.use(express.json());

// Giả lập cơ sở dữ liệu nội bộ riêng của Shop Module
const userBalances = {
  1: 500000,
  123: 1000000
};

/**
 * API: Mua Huy Hiệu VIP
 * 
 * TRIẾT LÝ ANTI-MESH TUYỆT ĐỐI:
 * Sau khi trừ tiền thành công, Shop Module TUYỆT ĐỐI KHÔNG gọi API sang Forum Module.
 * Shop chỉ phát tán sự kiện 'SHOP_VIP_BOUGHT' lên Redis Event Bus qua CoreBridge SDK.
 */
app.post('/api/buy-vip', async (req, res) => {
  const { badge = 'VANG', price = 99000, userId = 123 } = req.body;

  console.log(`\n🛒 [SHOP MODULE] Nhận yêu cầu mua huy hiệu [${badge}] từ User #${userId}...`);

  // 1. Logic nghiệp vụ nội bộ của Shop
  const currentBalance = userBalances[userId] || 500000;
  if (currentBalance < price) {
    return res.status(400).json({
      success: false,
      message: 'Số dư tài khoản không đủ để thanh toán.'
    });
  }

  userBalances[userId] = currentBalance - price;
  console.log(`✅ [SHOP MODULE] Đã trừ ${price} VNĐ. Số dư còn lại: ${userBalances[userId]} VNĐ.`);

  // 2. PHÁT SỰ KIỆN QUA CORE SDK BRIDGE (ZERO-TRUST & ANTI-MESH)
  try {
    const payload = {
      userId,
      badge,
      price,
      transactionId: `TX-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    console.log(`📡 [SHOP MODULE] Bắn sự kiện [SHOP_VIP_BOUGHT] lên Core Gateway (${GATEWAY_URL})...`);

    // Hàm emit tự động tạo mã băm HMAC-SHA256 với MODULE_SECRET để Gateway chứng thực
    const emitResult = await CoreBridge.emit(
      'SHOP_VIP_BOUGHT',
      payload,
      MODULE_SECRET,
      MODULE_ID,
      GATEWAY_URL
    );

    console.log(`🚀 [SHOP MODULE] Sự kiện đã được Redis Event Bus tiếp nhận thành công:`, emitResult);

    return res.json({
      success: true,
      message: `Chúc mừng bạn đã mua thành công huy hiệu ${badge}! Sự kiện đã được truyền tới toàn hệ sinh thái.`,
      newBalance: userBalances[userId],
      eventDispatched: 'SHOP_VIP_BOUGHT',
      payload
    });
  } catch (error) {
    console.error('❌ [SHOP MODULE] Lỗi khi phát sự kiện qua CoreBridge:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi phát tán sự kiện lên hệ sinh thái: ' + error.message
    });
  }
});

// Health check nội bộ của module
app.get('/health', (req, res) => {
  res.json({ module: MODULE_ID, status: 'operational', port: PORT });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛍️  Shop Module Backend đang chạy tại http://localhost:${PORT}`);
  console.log(`🔒  Zero-Trust Module Secret: [${MODULE_SECRET}]`);
  console.log(`🌐  Core Gateway URL: [${GATEWAY_URL}]`);
  console.log(`=======================================================`);
});

