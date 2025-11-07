// 奖品配置
const prizes = [
    { id: 1, name: "保温杯", icon: "🏆", weight: 1 },
    { id: 2, name: "棒棒糖", icon: "🍭", weight: 30 },
    { id: 3, name: "普通钥匙扣", icon: "🔑", weight: 20 },
    { id: 4, name: "定制钥匙扣", icon: "🔐", weight: 20 },
    { id: 5, name: "薯片", icon: "🥔", weight: 20 },
    { id: 6, name: "学习资料", icon: "📚", weight: 10 }
];

// 抽奖状态
let lotteryState = {
    chances: 0,
    isSpinning: false,
    currentRotation: 0,
    wonPrizes: []
};

// 初始化
window.onload = function() {
    loadInventory();
    
    // 检查URL参数中是否有管理员模式
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        document.getElementById('adminPanel').style.display = 'block';
    }
};

// 设置抽奖次数
function setChances() {
    const input = document.getElementById('chancesInput');
    const chances = parseInt(input.value);
    
    if (chances > 0 && chances <= 10) {
        lotteryState.chances = chances;
        document.getElementById('lotteryChances').textContent = chances;
        input.disabled = true;
    } else {
        alert('请输入1-10之间的数字');
    }
}

// 加载奖品库存
async function loadInventory() {
    try {
        const response = await fetch('/.netlify/functions/inventory');
        const inventory = await response.json();
        updatePrizesDisplay(inventory);
    } catch (error) {
        console.error('加载库存失败:', error);
    }
}

// 更新奖品显示
function updatePrizesDisplay(inventory) {
    const prizesGrid = document.getElementById('prizesGrid');
    prizesGrid.innerHTML = '';
    
    prizes.forEach(prize => {
        const prizeInfo = inventory[prize.id];
        const prizeCard = document.createElement('div');
        prizeCard.className = 'prize-card';
        
        let quantityText = '';
        if (prize.id === 6) { // 学习资料
            quantityText = '数量: 不限量';
        } else {
            const remaining = prizeInfo ? prizeInfo.quantity : 0;
            const initial = prizeInfo ? prizeInfo.initialQuantity : 0;
            quantityText = `数量: ${remaining}/${initial}`;
        }
        
        prizeCard.innerHTML = `
            <div class="prize-icon">${prize.icon}</div>
            <h4>${prize.name}</h4>
            <p>${quantityText}</p>
        `;
        
        prizesGrid.appendChild(prizeCard);
    });
}

// 抽奖函数
async function spinWheel() {
    if (lotteryState.isSpinning) return;
    if (lotteryState.chances <= 0) {
        alert('请先设置抽奖次数！');
        return;
    }
    
    lotteryState.isSpinning = true;
    document.getElementById('spinBtn').disabled = true;
    
    try {
        // 随机选择奖品
        const selectedPrize = selectRandomPrize();
        
        // 计算转盘停止位置
        const prizeIndex = prizes.findIndex(p => p.id === selectedPrize.id);
        const targetRotation = 360 * 5 + (prizeIndex * 60) + (Math.random() * 60);
        
        // 获取转盘元素
        const wheel = document.getElementById('prizeWheel');
        
        // 重置转盘位置（无动画）
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${lotteryState.currentRotation % 360}deg)`;
        
        // 强制重绘
        wheel.offsetHeight;
        
        // 应用旋转动画
        wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)';
        wheel.style.transform = `rotate(${lotteryState.currentRotation + targetRotation}deg)`;
        
        // 更新当前旋转角度
        lotteryState.currentRotation += targetRotation;
        
        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 向服务器发送抽奖请求
        const drawResponse = await fetch('/.netlify/functions/draw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prizeId: selectedPrize.id })
        });
        
        const drawResult = await drawResponse.json();
        
        if (drawResult.success) {
            // 抽奖成功
            lotteryState.chances--;
            document.getElementById('lotteryChances').textContent = lotteryState.chances;
            
            // 将抽中的奖品添加到列表
            lotteryState.wonPrizes.push(drawResult.prize);
            
            // 显示抽奖结果
            showLotteryResult(drawResult.prize, drawResult.remaining);
            
            // 更新库存显示
            loadInventory();
        } else {
            // 抽奖失败（库存不足）
            alert(drawResult.error || '抽奖失败，请重试');
        }
    } catch (error) {
        console.error('抽奖失败:', error);
        alert('抽奖失败，请检查网络连接');
    } finally {
        lotteryState.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;
        
        // 如果没有抽奖机会了，显示查看结果按钮
        if (lotteryState.chances === 0) {
            document.getElementById('spinBtn').textContent = '查看结果';
            document.getElementById('spinBtn').onclick = showLotteryResultScreen;
        }
    }
}

// 随机选择奖品（基于权重）
function selectRandomPrize() {
    // 计算总权重
    const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
    
    // 生成随机数
    let random = Math.random() * totalWeight;
    
    // 根据权重选择奖品
    for (const prize of prizes) {
        random -= prize.weight;
        if (random <= 0) {
            return prize;
        }
    }
    
    // 默认返回最后一个奖品（学习资料）
    return prizes[prizes.length - 1];
}

// 显示抽奖结果
function showLotteryResult(prize, remaining) {
    const resultModal = document.getElementById('lotteryResultModal');
    const resultIcon = document.getElementById('lotteryResultIcon');
    const resultTitle = document.getElementById('lotteryResultTitle');
    const resultText = document.getElementById('lotteryResultText');
    const nextBtn = document.getElementById('lotteryNextBtn');
    
    resultIcon.innerHTML = prize.icon;
    resultIcon.className = 'result-icon correct';
    resultTitle.innerHTML = '恭喜你！';
    resultTitle.className = 'correct';
    
    let quantityInfo = '';
    if (prize.id !== 6 && remaining !== undefined) {
        quantityInfo = `<br><small>剩余数量: ${remaining}</small>`;
    }
    
    let message = `你抽中了 <span class="highlight">${prize.name}</span>！${quantityInfo}`;
    
    if (prize.name === "学习资料") {
        message += `<br><br>学习资料可以帮助你更好地掌握技术知识，继续加油！`;
    } else if (prize.name === "保温杯") {
        message += `<br><br>这是我们的特等奖，恭喜你成为幸运儿！`;
    }
    
    resultText.innerHTML = message;
    
    // 根据剩余抽奖次数设置按钮文本
    if (lotteryState.chances > 0) {
        nextBtn.textContent = '继续抽奖';
        nextBtn.onclick = function() {
            resultModal.style.display = 'none';
        };
    } else {
        nextBtn.textContent = '查看全部结果';
        nextBtn.onclick = function() {
            resultModal.style.display = 'none';
            showLotteryResultScreen();
        };
    }
    
    resultModal.style.display = 'flex';
}

// 显示抽奖结果页面
function showLotteryResultScreen() {
    document.getElementById('lotteryScreen').style.display = 'none';
    document.getElementById('lotteryResultScreen').style.display = 'block';
    
    // 更新总奖品数量
    document.getElementById('totalPrizes').textContent = lotteryState.wonPrizes.length;
    
    // 生成奖品列表
    const resultContainer = document.getElementById('resultContainer');
    
    if (lotteryState.wonPrizes.length === 0) {
        resultContainer.innerHTML = `
            <div class="empty-result">
                <div class="icon">😢</div>
                <h3>很遗憾，这次没有抽中奖品</h3>
                <p>下次再接再厉！</p>
            </div>
        `;
    } else {
        resultContainer.innerHTML = '';
        lotteryState.wonPrizes.forEach((prize, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-icon">${prize.icon}</div>
                <div class="result-details">
                    <h3>${prize.name}</h3>
                    <p>第${index + 1}次抽奖获得</p>
                </div>
            `;
            resultContainer.appendChild(resultItem);
        });
    }
}

// 返回抽奖界面
function goBackToLottery() {
    document.getElementById('lotteryResultScreen').style.display = 'none';
    document.getElementById('lotteryScreen').style.display = 'block';
    
    // 重置按钮状态
    document.getElementById('spinBtn').textContent = '开始抽奖';
    document.getElementById('spinBtn').onclick = spinWheel;
    
    // 启用次数输入
    document.getElementById('chancesInput').disabled = false;
}

// 分享结果功能
function shareResults() {
    const prizeCount = lotteryState.wonPrizes.length;
    let message = `我在百团大战抽奖活动中抽中了${prizeCount}件奖品！`;
    
    if (prizeCount > 0) {
        message += " 包括：";
        const prizeNames = lotteryState.wonPrizes.map(prize => prize.name);
        message += prizeNames.join("、");
    }
    
    // 尝试使用Web Share API
    if (navigator.share) {
        navigator.share({
            title: '我的抽奖结果',
            text: message,
            url: window.location.href
        }).catch(err => {
            console.log('分享失败:', err);
            fallbackShare(message);
        });
    } else {
        fallbackShare(message);
    }
}

// 备用分享方法
function fallbackShare(message) {
    // 复制到剪贴板
    const textArea = document.createElement('textarea');
    textArea.value = message;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    alert('结果已复制到剪贴板，快去分享给朋友吧！');
}

// 管理员功能 - 重置库存
async function resetInventory() {
    if (!confirm('确定要重置所有奖品库存吗？')) return;
    
    try {
        const response = await fetch('/.netlify/functions/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: 'admin123' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('库存重置成功！');
            loadInventory();
        } else {
            alert('重置失败: ' + result.error);
        }
    } catch (error) {
        console.error('重置失败:', error);
        alert('重置失败，请检查网络连接');
    }
}

// 管理员功能 - 查看库存
async function showInventory() {
    try {
        const response = await fetch('/.netlify/functions/inventory');
        const inventory = await response.json();
        
        let inventoryText = '当前库存:\n';
        Object.values(inventory).forEach(prize => {
            if (prize.initialQuantity === Infinity) {
                inventoryText += `${prize.name}: 不限量\n`;
            } else {
                inventoryText += `${prize.name}: ${prize.quantity}/${prize.initialQuantity}\n`;
            }
        });
        
        alert(inventoryText);
    } catch (error) {
        console.error('获取库存失败:', error);
        alert('获取库存失败');
    }
}