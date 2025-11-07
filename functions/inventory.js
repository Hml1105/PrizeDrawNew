// Netlify Function 管理奖品库存
let prizeInventory = {
  1: { name: "保温杯", icon: "🏆", quantity: 1, initialQuantity: 1 },
  2: { name: "棒棒糖", icon: "🍭", quantity: 130, initialQuantity: 130 },
  3: { name: "普通钥匙扣", icon: "🔑", quantity: 50, initialQuantity: 50 },
  4: { name: "定制钥匙扣", icon: "🔐", quantity: 50, initialQuantity: 50 },
  5: { name: "薯片", icon: "🥔", quantity: 50, initialQuantity: 50 },
  6: { name: "学习资料", icon: "📚", quantity: Infinity, initialQuantity: Infinity }
};

exports.handler = async function(event, context) {
  const { httpMethod, path } = event;
  
  // 获取库存
  if (httpMethod === 'GET' && path === '/.netlify/functions/inventory') {
    return {
      statusCode: 200,
      body: JSON.stringify(prizeInventory)
    };
  }
  
  // 抽奖 - 减少库存
  if (httpMethod === 'POST' && path === '/.netlify/functions/draw') {
    try {
      const { prizeId } = JSON.parse(event.body);
      
      // 检查奖品是否存在且有库存
      if (!prizeInventory[prizeId]) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: '奖品不存在' })
        };
      }
      
      const prize = prizeInventory[prizeId];
      
      // 检查库存
      if (prize.quantity > 0) {
        // 减少库存（学习资料除外）
        if (prize.initialQuantity !== Infinity) {
          prizeInventory[prizeId].quantity--;
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            prize: prizeInventory[prizeId],
            remaining: prizeInventory[prizeId].quantity
          })
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: '奖品已抽完' })
        };
      }
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '服务器错误' })
      };
    }
  }
  
  // 重置库存（管理员功能）
  if (httpMethod === 'POST' && path === '/.netlify/functions/reset') {
    try {
      // 简单的密码验证
      const { password } = JSON.parse(event.body);
      if (password !== 'admin123') {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: '未授权' })
        };
      }
      
      // 重置库存
      prizeInventory = {
        1: { name: "保温杯", icon: "🏆", quantity: 1, initialQuantity: 1 },
        2: { name: "棒棒糖", icon: "🍭", quantity: 130, initialQuantity: 130 },
        3: { name: "普通钥匙扣", icon: "🔑", quantity: 50, initialQuantity: 50 },
        4: { name: "定制钥匙扣", icon: "🔐", quantity: 50, initialQuantity: 50 },
        5: { name: "薯片", icon: "🥔", quantity: 50, initialQuantity: 50 },
        6: { name: "学习资料", icon: "📚", quantity: Infinity, initialQuantity: Infinity }
      };
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, inventory: prizeInventory })
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '重置失败' })
      };
    }
  }
  
  return {
    statusCode: 404,
    body: JSON.stringify({ error: '接口不存在' })
  };
};