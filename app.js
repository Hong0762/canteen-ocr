// ============ 全局状态 ============
const STATE = {
    records: [],
    currentImage: null,
    baiduToken: '',
    tokenExpire: 0,
    config: {
        apiKey: '',
        secretKey: '',
        categoryMap: {}
    }
};

// 默认食材分类
const DEFAULT_CATEGORIES = {
    '肉类': ['猪肉', '排骨', '五花肉', '瘦肉', '鸡', '鸭', '鱼', '虾', '牛肉', '羊肉', '鸡蛋', '鸡胸', '鸡腿', '鸡翅', '鸭腿', '虾米', '鱼头', '鱼片', '肉', '排骨'],
    '蔬菜': ['白菜', '青菜', '萝卜', '土豆', '番茄', '西红柿', '黄瓜', '辣椒', '茄子', '豆角', '芹菜', '菠菜', '生菜', '洋葱', '蒜', '姜', '葱', '韭菜', '冬瓜', '南瓜', '丝瓜', '苦瓜', '莲藕', '山药', '木耳', '香菇', '豆芽', '西兰花', '花菜', '青椒', '红椒', '胡萝卜', '白萝卜', '包菜', '大白菜', '小白菜', '空心菜', '苋菜', '竹笋'],
    '豆制品': ['豆腐', '豆干', '腐竹', '豆腐皮', '千张', '豆皮'],
    '调料': ['盐', '酱油', '醋', '料酒', '味精', '鸡精', '糖', '淀粉', '花椒', '八角', '桂皮', '辣椒粉', '胡椒粉', '食用油', '花生油', '色拉油', '蚝油', '豆瓣酱', '生抽', '老抽', '芝麻油', '香油'],
    '米面粮油': ['米', '大米', '面粉', '面条', '挂面', '食用油', '花生油'],
    '水果': ['苹果', '香蕉', '橙子', '梨', '西瓜', '葡萄', '橘子', '柚子'],
    '其他': []
};

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadRecords();
    setupTabs();
    setupScan();
    setupRecords();
    setupAnalysis();
    setupSettings();
});

// ============ 本地存储 ============
function loadConfig() {
    try {
        const saved = localStorage.getItem('canteen_ocr_config');
        if (saved) {
            Object.assign(STATE.config, JSON.parse(saved));
            if (!STATE.config.categoryMap || Object.keys(STATE.config.categoryMap).length === 0) {
                STATE.config.categoryMap = DEFAULT_CATEGORIES;
            }
        } else {
            STATE.config.categoryMap = DEFAULT_CATEGORIES;
        }
    } catch(e) {}

    // 预设API Key
    if (!STATE.config.apiKey) {
        STATE.config.apiKey = 'vZpGGmXrI9jGKyQ7OvXH7yG8';
    }
    if (!STATE.config.secretKey) {
        STATE.config.secretKey = 'jD2LkF4jBzNtQaUeVcRmPbTnShMgZjXf';
    }
}

function saveConfig() {
    localStorage.setItem('canteon_ocr_config', JSON.stringify(STATE.config));
    localStorage.setItem('canteen_ocr_config', JSON.stringify(STATE.config));
}

function loadRecords() {
    try {
        const saved = localStorage.getItem('canteen_ocr_records');
        if (saved) STATE.records = JSON.parse(saved);
    } catch(e) {}
}

function saveRecords() {
    localStorage.setItem('canteen_ocr_records', JSON.stringify(STATE.records));
}

// ============ Tab切换 ============
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`page-${tab.dataset.tab}`).classList.add('active');

            if (tab.dataset.tab === 'records') refreshRecords();
            if (tab.dataset.tab === 'analysis') refreshAnalysis();
            if (tab.dataset.tab === 'settings') refreshSettings();
        });
    });
}

// ============ 拍照识别 ============
function setupScan() {
    const fileInput = document.getElementById('file-input');
    const btnUpload = document.getElementById('btn-upload');
    const btnRetake = document.getElementById('btn-retake');
    const btnRecognize = document.getElementById('btn-recognize');
    const btnSave = document.getElementById('btn-save');
    const btnReset = document.getElementById('btn-reset');
    const btnAddRow = document.getElementById('btn-add-row');

    btnUpload.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        previewImage(file);
    });

    btnRetake.addEventListener('click', () => {
        STATE.currentImage = null;
        document.getElementById('preview-box').style.display = 'none';
        document.getElementById('upload-box').style.display = 'flex';
        document.getElementById('result-area').style.display = 'none';
        btnRecognize.disabled = true;
        fileInput.value = '';
    });

    btnRecognize.addEventListener('click', async () => {
        if (!STATE.currentImage) return;
        btnRecognize.disabled = true;
        btnRecognize.innerHTML = '<span class="loading"></span> 识别中...';
        try {
            const result = await recognizeImage(STATE.currentImage);
            showResult(result);
        } catch(err) {
            showToast('识别失败: ' + err.message);
        }
        btnRecognize.disabled = false;
        btnRecognize.textContent = '开始识别';
    });

    btnSave.addEventListener('click', () => {
        saveRecord();
    });

    btnReset.addEventListener('click', () => {
        document.getElementById('result-area').style.display = 'none';
    });

    btnAddRow.addEventListener('click', () => {
        addItemRow({}, false);
        updateTotal();
    });

    // 设置默认日期
    document.getElementById('result-date').value = new Date().toISOString().split('T')[0];
}

function previewImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        STATE.currentImage = e.target.result;
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('upload-box').style.display = 'none';
        document.getElementById('preview-box').style.display = 'block';
        document.getElementById('btn-recognize').disabled = false;
    };
    reader.readAsDataURL(file);
}

// ============ 百度OCR ============
async function getBaiduToken() {
    if (STATE.baiduToken && Date.now() < STATE.tokenExpire) {
        return STATE.baiduToken;
    }

    const { apiKey, secretKey } = STATE.config;
    if (!apiKey || !secretKey) throw new Error('请先配置百度OCR的API Key和Secret Key');

    const resp = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`);
    const data = await resp.json();

    if (data.error) throw new Error(data.error_description || '获取Token失败');

    STATE.baiduToken = data.access_token;
    STATE.tokenExpire = Date.now() + (data.expires_in - 600) * 1000;
    return STATE.baiduToken;
}

async function recognizeImage(base64Data) {
    const token = await getBaiduToken();

    // 提取纯base64
    let imageBase64 = base64Data;
    if (base64Data.includes(',')) {
        imageBase64 = base64Data.split(',')[1];
    }

    const resp = await fetch(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token=${token}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `image=${encodeURIComponent(imageBase64)}`
        }
    );

    const data = await resp.json();

    if (data.error_code) {
        throw new Error(data.error_msg || `OCR错误(${data.error_code})`);
    }

    return parseOCRResult(data);
}

function parseOCRResult(data) {
    if (!data.words_result || data.words_result.length === 0) {
        return { supplier: '', date: '', items: [], rawText: '' };
    }

    const lines = data.words_result.map(item => item.words.trim());
    let supplier = '';
    let date = '';
    const items = [];

    // 解析日期
    for (const line of lines) {
        const dateMatch = line.match(/(\d{4})[年/\-.](\d{1,2})[月/\-.](\d{1,2})/);
        if (dateMatch) {
            const y = dateMatch[1];
            const m = dateMatch[2].padStart(2, '0');
            const d = dateMatch[3].padStart(2, '0');
            date = `${y}-${m}-${d}`;
        }
    }

    // 解析供应商（通常在第一行或含"供应商"关键字的行）
    for (const line of lines) {
        if (line.match(/供应商|供货|卖方|提供/)) {
            supplier = line.replace(/供应商|供货|卖方|提供|[：:]/g, '').trim();
            break;
        }
    }
    if (!supplier && lines.length > 0) {
        // 尝试第一行作为供应商
        const first = lines[0];
        if (!first.match(/^\d/)) {
            supplier = first;
        }
    }

    // 解析明细行：匹配 数字模式（单价/金额）
    const numPattern = /(\d+\.?\d*)/g;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nums = line.match(numPattern);
        if (nums && nums.length >= 3) {
            // 尝试解析明细行
            // 去掉数字部分，剩余作为品名
            let namePart = line.replace(/[\d\s.,，、kg斤公斤g克元￥＄:：×xX*＊]+/g, '').trim();

            // 跳过总价行
            if (namePart.match(/合计|总计|总价|小计|总额|合计/)) continue;

            // 尝试多种解析模式
            let item = null;

            // 模式：品名 单价 单位 重量 金额
            if (nums.length >= 4) {
                // 尝试找到单位
                const unitMatch = line.match(/(kg|斤|公斤|g|克|个|只|包|袋|箱|瓶|桶|盒|斤)/);
                const unit = unitMatch ? unitMatch[1] : '斤';
                item = {
                    name: namePart || `食材${items.length + 1}`,
                    price: parseFloat(nums[0]) || 0,
                    unit: unit,
                    weight: parseFloat(nums[1]) || 0,
                    amount: parseFloat(nums[nums.length - 1]) || 0
                };
            } else if (nums.length >= 3) {
                // 简化模式
                const unitMatch = line.match(/(kg|斤|公斤|g|克|个|只|包|袋|箱|瓶|桶|盒|斤)/);
                const unit = unitMatch ? unitMatch[1] : '斤';
                item = {
                    name: namePart || `食材${items.length + 1}`,
                    price: parseFloat(nums[0]) || 0,
                    unit: unit,
                    weight: parseFloat(nums[1]) || 0,
                    amount: parseFloat(nums[2]) || 0
                };
            } else if (nums.length >= 2) {
                const unitMatch = line.match(/(kg|斤|公斤|g|克|个|只|包|袋|箱|瓶|桶|盒|斤)/);
                const unit = unitMatch ? unitMatch[1] : '斤';
                item = {
                    name: namePart || `食材${items.length + 1}`,
                    price: parseFloat(nums[0]) || 0,
                    unit: unit,
                    weight: '',
                    amount: parseFloat(nums[1]) || 0
                };
            }

            if (item && item.name && item.name.length > 0 && item.name.length < 20) {
                items.push(item);
            }
        }
    }

    // 如果自动解析效果不好，返回原始文本供手动编辑
    return {
        supplier,
        date,
        items,
        rawText: lines.join('\n')
    };
}

function showResult(result) {
    document.getElementById('result-supplier').value = result.supplier;
    document.getElementById('result-date').value = result.date || new Date().toISOString().split('T')[0];

    const tbody = document.getElementById('items-body');
    tbody.innerHTML = '';

    if (result.items.length > 0) {
        result.items.forEach(item => addItemRow(item, false));
    } else {
        // 没有识别出明细，提示用户手动添加
        showToast('未能自动解析明细，请手动添加');
        addItemRow({}, false);
    }

    updateTotal();
    document.getElementById('result-area').style.display = 'block';
}

function addItemRow(item = {}, animate = true) {
    const tbody = document.getElementById('items-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="item-name" value="${item.name || ''}" placeholder="品名"></td>
        <td><input type="number" class="item-price" value="${item.price || ''}" placeholder="单价" step="0.01"></td>
        <td><input type="text" class="item-unit" value="${item.unit || '斤'}" placeholder="单位" style="width:50px;"></td>
        <td><input type="number" class="item-weight" value="${item.weight || ''}" placeholder="重量" step="0.01"></td>
        <td><input type="number" class="item-amount" value="${item.amount || ''}" placeholder="金额" step="0.01"></td>
        <td><button class="btn-del" title="删除">×</button></td>
    `;

    // 自动计算金额
    const priceInput = tr.querySelector('.item-price');
    const weightInput = tr.querySelector('.item-weight');
    const amountInput = tr.querySelector('.item-amount');

    const autoCalc = () => {
        const p = parseFloat(priceInput.value) || 0;
        const w = parseFloat(weightInput.value) || 0;
        if (p && w) {
            amountInput.value = (p * w).toFixed(2);
        }
        updateTotal();
    };

    priceInput.addEventListener('input', autoCalc);
    weightInput.addEventListener('input', autoCalc);
    amountInput.addEventListener('input', updateTotal);

    tr.querySelector('.btn-del').addEventListener('click', () => {
        tr.remove();
        updateTotal();
    });

    tbody.appendChild(tr);

    if (animate) {
        tr.style.animation = 'fadeIn 0.2s ease';
    }
}

function updateTotal() {
    let total = 0;
    document.querySelectorAll('#items-body tr').forEach(tr => {
        const amount = parseFloat(tr.querySelector('.item-amount')?.value) || 0;
        total += amount;
    });
    document.getElementById('total-amount').textContent = '¥' + total.toFixed(2);
}

function getFormItems() {
    const items = [];
    document.querySelectorAll('#items-body tr').forEach(tr => {
        const name = tr.querySelector('.item-name').value.trim();
        const price = parseFloat(tr.querySelector('.item-price').value) || 0;
        const unit = tr.querySelector('.item-unit').value.trim();
        const weight = parseFloat(tr.querySelector('.item-weight').value) || 0;
        const amount = parseFloat(tr.querySelector('.item-amount').value) || 0;
        if (name || amount) {
            items.push({ name, price, unit, weight, amount });
        }
    });
    return items;
}

function saveRecord() {
    const supplier = document.getElementById('result-supplier').value.trim();
    const date = document.getElementById('result-date').value;
    const items = getFormItems();

    if (!date) {
        showToast('请选择日期');
        return;
    }
    if (items.length === 0) {
        showToast('请至少添加一行明细');
        return;
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    const record = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        supplier,
        date,
        items,
        total,
        createdAt: Date.now()
    };

    STATE.records.unshift(record);
    saveRecords();

    // 重置表单
    STATE.currentImage = null;
    document.getElementById('preview-box').style.display = 'none';
    document.getElementById('upload-box').style.display = 'flex';
    document.getElementById('result-area').style.display = 'none';
    document.getElementById('btn-recognize').disabled = true;
    document.getElementById('file-input').value = '';

    showToast('✅ 保存成功！');

    // 切换到记录页
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="records"]').classList.add('active');
    document.getElementById('page-records').classList.add('active');
    refreshRecords();
}

// ============ 采购记录 ============
function setupRecords() {
    document.getElementById('btn-export').addEventListener('click', exportExcel);
    document.getElementById('btn-clear-all').addEventListener('click', () => {
        if (confirm('确定要清空所有记录吗？此操作不可撤销！')) {
            STATE.records = [];
            saveRecords();
            refreshRecords();
            showToast('已清空全部记录');
        }
    });
}

function refreshRecords() {
    const monthFilter = document.getElementById('filter-month').value;
    const supplierFilter = document.getElementById('filter-supplier').value;

    // 更新筛选选项
    updateFilterOptions();

    let filtered = STATE.records;
    if (monthFilter !== 'all') {
        filtered = filtered.filter(r => r.date.startsWith(monthFilter));
    }
    if (supplierFilter !== 'all') {
        filtered = filtered.filter(r => r.supplier === supplierFilter);
    }

    const listEl = document.getElementById('records-list');

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无采购记录</div>';
        return;
    }

    listEl.innerHTML = filtered.map(record => `
        <div class="record-card" data-id="${record.id}">
            <div class="record-header">
                <span class="record-supplier">${record.supplier || '未填写供应商'}</span>
                <span class="record-date">${record.date}</span>
            </div>
            <div class="record-summary">
                <span>${record.items.length} 种食材</span>
                <span class="record-total">¥${record.total.toFixed(2)}</span>
            </div>
        </div>
    `).join('');

    // 点击查看详情
    listEl.querySelectorAll('.record-card').forEach(card => {
        card.addEventListener('click', () => {
            const record = STATE.records.find(r => r.id === card.dataset.id);
            if (record) showRecordDetail(record);
        });
    });
}

function updateFilterOptions() {
    // 月份筛选
    const monthSelect = document.getElementById('filter-month');
    const months = [...new Set(STATE.records.map(r => r.date.slice(0, 7)))].sort().reverse();
    const currentMonthVal = monthSelect.value;
    monthSelect.innerHTML = '<option value="all">全部月份</option>' +
        months.map(m => `<option value="${m}">${m}</option>`).join('');
    if (currentMonthVal) monthSelect.value = currentMonthVal;

    // 供应商筛选
    const supplierSelect = document.getElementById('filter-supplier');
    const suppliers = [...new Set(STATE.records.map(r => r.supplier).filter(Boolean))];
    const currentSupVal = supplierSelect.value;
    supplierSelect.innerHTML = '<option value="all">全部供应商</option>' +
        suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
    if (currentSupVal) supplierSelect.value = currentSupVal;

    document.getElementById('filter-month').addEventListener('change', refreshRecords);
    document.getElementById('filter-supplier').addEventListener('change', refreshRecords);
}

function showRecordDetail(record) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${record.supplier || '采购详情'} - ${record.date}</h2>
                <button class="modal-close">×</button>
            </div>
            <div class="detail-items">
                <table>
                    <thead>
                        <tr>
                            <th>食材</th>
                            <th>单价</th>
                            <th>单位</th>
                            <th>重量</th>
                            <th>金额</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${record.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.price}</td>
                                <td>${item.unit}</td>
                                <td>${item.weight}</td>
                                <td>${item.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align:right;font-weight:600;">总计</td>
                            <td style="font-weight:700;color:#fa5151;">¥${record.total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" id="modal-del">删除此记录</button>
                <button class="btn-primary modal-close-btn">关闭</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#modal-del').addEventListener('click', () => {
        if (confirm('确定删除此记录？')) {
            STATE.records = STATE.records.filter(r => r.id !== record.id);
            saveRecords();
            overlay.remove();
            refreshRecords();
            showToast('已删除');
        }
    });
}

function exportExcel() {
    if (STATE.records.length === 0) {
        showToast('暂无数据可导出');
        return;
    }

    const wb = XLSX.utils.book_new();

    // 汇总表
    const summaryData = STATE.records.map(r => ({
        '日期': r.date,
        '供应商': r.supplier,
        '食材种类': r.items.length,
        '总金额': r.total
    }));
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, '采购汇总');

    // 明细表
    const detailData = [];
    STATE.records.forEach(r => {
        r.items.forEach(item => {
            detailData.push({
                '日期': r.date,
                '供应商': r.supplier,
                '食材': item.name,
                '单价': item.price,
                '单位': item.unit,
                '重量': item.weight,
                '金额': item.amount,
                '分类': classifyFood(item.name)
            });
        });
    });
    const ws2 = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, ws2, '采购明细');

    const now = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `食堂采购数据_${now}.xlsx`);
    showToast('✅ Excel已导出');
}

// ============ 统计分析 ============
function setupAnalysis() {
    document.getElementById('analysis-month').addEventListener('change', refreshAnalysis);
}

function refreshAnalysis() {
    const monthFilter = document.getElementById('analysis-month').value;

    // 更新月份选项
    const monthSelect = document.getElementById('analysis-month');
    const months = [...new Set(STATE.records.map(r => r.date.slice(0, 7)))].sort().reverse();
    monthSelect.innerHTML = '<option value="all">全部</option>' +
        months.map(m => `<option value="${m}">${m}</option>`).join('');
    if (monthFilter) monthSelect.value = monthFilter;

    let filtered = STATE.records;
    if (monthFilter !== 'all') {
        filtered = filtered.filter(r => r.date.startsWith(monthFilter));
    }

    // 统计卡片
    const totalAmount = filtered.reduce((sum, r) => sum + r.total, 0);
    const totalCount = filtered.length;
    const allItems = filtered.flatMap(r => r.items);
    const uniqueFoods = new Set(allItems.map(i => i.name).filter(Boolean)).size;
    const uniqueSuppliers = new Set(filtered.map(r => r.supplier).filter(Boolean)).size;

    document.getElementById('stat-cards').innerHTML = `
        <div class="stat-card danger">
            <div class="stat-value">¥${totalAmount.toFixed(0)}</div>
            <div class="stat-label">采购总额</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalCount}</div>
            <div class="stat-label">采购单数</div>
        </div>
        <div class="stat-card warning">
            <div class="stat-value">${uniqueFoods}</div>
            <div class="stat-label">食材种类</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${uniqueSuppliers}</div>
            <div class="stat-label">供应商数</div>
        </div>
    `;

    // 月度趋势图
    renderMonthlyChart(filtered);

    // 品类占比图
    renderCategoryChart(allItems);

    // 供应商对比图
    renderSupplierChart(filtered);
}

function renderMonthlyChart(records) {
    const chartDom = document.getElementById('chart-monthly');
    const chart = echarts.init(chartDom);

    const monthMap = {};
    records.forEach(r => {
        const month = r.date.slice(0, 7);
        monthMap[month] = (monthMap[month] || 0) + r.total;
    });

    const months = Object.keys(monthMap).sort();
    const amounts = months.map(m => monthMap[m]);

    chart.setOption({
        tooltip: {
            trigger: 'axis',
            formatter: '{b}<br/>采购额: ¥{c}'
        },
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: months },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: '¥{value}' }
        },
        series: [{
            data: amounts,
            type: 'bar',
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#07c160' },
                    { offset: 1, color: '#06ad56' }
                ])
            },
            barWidth: '50%'
        }]
    });

    window.addEventListener('resize', () => chart.resize());
}

function renderCategoryChart(items) {
    const chartDom = document.getElementById('chart-category');
    const chart = echarts.init(chartDom);

    const categoryMap = {};
    items.forEach(item => {
        const cat = classifyFood(item.name);
        categoryMap[cat] = (categoryMap[cat] || 0) + item.amount;
    });

    const data = Object.entries(categoryMap)
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value: +value.toFixed(2) }));

    chart.setOption({
        tooltip: {
            trigger: 'item',
            formatter: '{b}: ¥{c} ({d}%)'
        },
        legend: {
            orient: 'horizontal',
            bottom: 0,
            type: 'scroll'
        },
        series: [{
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            emphasis: {
                label: { show: true, fontSize: 14, fontWeight: 'bold' }
            },
            data
        }]
    });

    window.addEventListener('resize', () => chart.resize());
}

function renderSupplierChart(records) {
    const chartDom = document.getElementById('chart-supplier');
    const chart = echarts.init(chartDom);

    const supplierMap = {};
    records.forEach(r => {
        const name = r.supplier || '未填写';
        supplierMap[name] = (supplierMap[name] || 0) + r.total;
    });

    const names = Object.keys(supplierMap).sort((a, b) => supplierMap[b] - supplierMap[a]);
    const values = names.map(n => supplierMap[n]);

    chart.setOption({
        tooltip: { trigger: 'axis', formatter: '{b}<br/>¥{c}' },
        grid: { left: 80, right: 20, top: 10, bottom: 20 },
        xAxis: { type: 'value', axisLabel: { formatter: '¥{value}' } },
        yAxis: { type: 'category', data: names },
        series: [{
            type: 'bar',
            data: values,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: '#07c160' },
                    { offset: 1, color: '#71d89b' }
                ])
            }
        }]
    });

    window.addEventListener('resize', () => chart.resize());
}

function classifyFood(name) {
    if (!name) return '其他';
    const map = STATE.config.categoryMap || DEFAULT_CATEGORIES;
    for (const [category, keywords] of Object.entries(map)) {
        for (const kw of keywords) {
            if (name.includes(kw)) return category;
        }
    }
    return '其他';
}

// ============ 设置页 ============
function setupSettings() {
    document.getElementById('btn-save-config').addEventListener('click', () => {
        STATE.config.apiKey = document.getElementById('set-api-key').value.trim();
        STATE.config.secretKey = document.getElementById('set-secret-key').value.trim();
        saveConfig();
        // 重置token让下次重新获取
        STATE.baiduToken = '';
        STATE.tokenExpire = 0;
        showToast('✅ 配置已保存');
        refreshTokenStatus();
    });

    document.getElementById('btn-add-category').addEventListener('click', () => {
        const mapEl = document.getElementById('category-map');
        const row = document.createElement('div');
        row.className = 'category-row';
        row.innerHTML = `
            <input type="text" class="cat-name" placeholder="分类名" value="新分类">
            <input type="text" class="cat-keywords" placeholder="关键词(逗号分隔)">
            <button class="btn-del" title="删除">×</button>
        `;
        row.querySelector('.btn-del').addEventListener('click', () => {
            row.remove();
            saveCategoryMap();
        });
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', saveCategoryMap);
        });
        mapEl.appendChild(row);
    });

    document.getElementById('btn-export-all').addEventListener('click', () => {
        const data = JSON.stringify({ records: STATE.records, config: STATE.config }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `食堂采购数据备份_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ 备份已导出');
    });

    document.getElementById('btn-import-data').addEventListener('click', () => {
        document.getElementById('import-input').click();
    });

    document.getElementById('import-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.records) {
                    const importCount = data.records.length;
                    STATE.records = [...data.records, ...STATE.records];
                    // 去重
                    const ids = new Set();
                    STATE.records = STATE.records.filter(r => {
                        if (ids.has(r.id)) return false;
                        ids.add(r.id);
                        return true;
                    });
                    saveRecords();
                    if (data.config) {
                        Object.assign(STATE.config, data.config);
                        saveConfig();
                    }
                    showToast(`✅ 已导入 ${importCount} 条记录`);
                } else {
                    showToast('无效的备份文件');
                }
            } catch(err) {
                showToast('导入失败: 文件格式错误');
            }
        };
        reader.readAsText(file);
    });
}

function refreshSettings() {
    document.getElementById('set-api-key').value = STATE.config.apiKey;
    document.getElementById('set-secret-key').value = STATE.config.secretKey;
    refreshTokenStatus();
    refreshCategoryMap();
}

function refreshTokenStatus() {
    const statusEl = document.getElementById('token-status');
    if (STATE.baiduToken && Date.now() < STATE.tokenExpire) {
        statusEl.textContent = '已获取（有效）';
        statusEl.style.color = '#07c160';
    } else if (STATE.config.apiKey && STATE.config.secretKey) {
        statusEl.textContent = '未获取（已配置）';
        statusEl.style.color = '#ff9500';
    } else {
        statusEl.textContent = '未配置';
        statusEl.style.color = '#fa5151';
    }
}

function refreshCategoryMap() {
    const mapEl = document.getElementById('category-map');
    mapEl.innerHTML = '';
    const map = STATE.config.categoryMap || DEFAULT_CATEGORIES;
    Object.entries(map).forEach(([cat, keywords]) => {
        const row = document.createElement('div');
        row.className = 'category-row';
        row.innerHTML = `
            <input type="text" class="cat-name" value="${cat}" placeholder="分类名">
            <input type="text" class="cat-keywords" value="${keywords.join(',')}" placeholder="关键词(逗号分隔)">
            <button class="btn-del" title="删除">×</button>
        `;
        row.querySelector('.btn-del').addEventListener('click', () => {
            row.remove();
            saveCategoryMap();
        });
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', saveCategoryMap);
        });
        mapEl.appendChild(row);
    });
}

function saveCategoryMap() {
    const map = {};
    document.querySelectorAll('.category-row').forEach(row => {
        const name = row.querySelector('.cat-name').value.trim();
        const keywords = row.querySelector('.cat-keywords').value.split(/[,，]/).map(k => k.trim()).filter(Boolean);
        if (name) map[name] = keywords;
    });
    STATE.config.categoryMap = map;
    saveConfig();
    showToast('分类已更新');
}

// ============ 工具函数 ============
function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}
