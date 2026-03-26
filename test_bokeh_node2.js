// 在 Node.js 环境中模拟 Bokeh 初始化

// 先提取 docs_json
const fs = require('fs');
const htmlContent = fs.readFileSync('test_repro.html', 'utf8');
const docsJsonMatch = htmlContent.match(/docs_json = '([^']+)'/);

if (docsJsonMatch) {
    let docsJson = docsJsonMatch[1];
    
    // 转义处理
    docsJson = docsJson.replace(/\\x3C/g, '<');
    docsJson = docsJson.replace(/\\'/g, "'");
    docsJson = docsJson.replace(/\\"/g, '"');
    
    // 解析看看结构
    const docs = JSON.parse(docsJson);
    const docId = Object.keys(docs)[0];
    console.log('Doc ID:', docId);
    
    // 查找所有对象
    const allObjects = [];
    const findAllObjects = (obj, path = '') => {
        if (obj && typeof obj === 'object') {
            if (obj.type && obj.type !== 'object') {
                allObjects.push({ type: obj.type, attributes: obj.attributes, id: obj.id });
            }
            for (const key in obj) {
                findAllObjects(obj[key], path + '.' + key);
            }
        }
    };
    findAllObjects(docs[docId], 'docs[docId]');
    
    console.log('\n所有 Bokeh 对象:');
    allObjects.forEach(obj => {
        if (obj.type.includes('Ticker') || obj.type.includes('Axis')) {
            console.log(`  - ${obj.type}: ${obj.id}`);
            if (obj.type === 'MonthsTicker') {
                console.log(`    months:`, obj.attributes?.months);
                console.log(`    interval:`, obj.attributes?.interval);
            }
            if (obj.type === 'DatetimeTicker') {
                console.log(`    tickers:`, obj.attributes?.tickers?.map(t => t.type));
            }
        }
    });
    
    // 检查属性顺序
    console.log('\n检查 MonthsTicker 属性定义顺序:');
    const monthsTickers = allObjects.filter(obj => obj.type === 'MonthsTicker');
    monthsTickers.forEach(mt => {
        console.log('  MonthsTicker 有属性:', Object.keys(mt.attributes || {}));
    });
    
} else {
    console.log('未能提取 docs_json');
}
