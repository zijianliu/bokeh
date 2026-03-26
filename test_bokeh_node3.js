const fs = require('fs');
const htmlContent = fs.readFileSync('test_repro.html', 'utf8');
const docsJsonMatch = htmlContent.match(/docs_json = '([^']+)'/);

if (docsJsonMatch) {
    let docsJson = docsJsonMatch[1];
    docsJson = docsJson.replace(/\\x3C/g, '<');
    docsJson = docsJson.replace(/\\'/g, "'");
    docsJson = docsJson.replace(/\\"/g, '"');
    
    const docs = JSON.parse(docsJson);
    const docId = Object.keys(docs)[0];
    
    // 打印完整结构
    console.log('Root keys:', Object.keys(docs[docId]));
    console.log('Roots type:', typeof docs[docId].roots, 'Array.isArray:', Array.isArray(docs[docId].roots));
    
    // 遍历查找所有包含 "type" 的对象
    const allTyped = [];
    const findAll = (obj, depth = 0, maxDepth = 10) => {
        if (!obj || depth > maxDepth) return;
        
        if (obj && typeof obj === 'object') {
            if (obj.type && obj.type !== 'object') {
                allTyped.push({ type: obj.type, attributes: obj.attributes, id: obj.id });
            }
            if (obj.type === 'object' && obj.name) {
                allTyped.push({ type: obj.name, attributes: obj.attributes, id: obj.id });
            }
            for (const key in obj) {
                findAll(obj[key], depth + 1, maxDepth);
            }
        }
    };
    
    findAll(docs[docId], 0, 15);
    
    console.log('\n所有 typed 对象:');
    allTyped.forEach(obj => {
        if (obj.type && obj.type.includes('Ticker')) {
            console.log(`  - ${obj.type}: ${obj.id}`);
            if (obj.type === 'MonthsTicker' || obj.name === 'MonthsTicker') {
                console.log(`    months:`, obj.attributes?.months);
                console.log(`    interval:`, obj.attributes?.interval);
                console.log(`    all attrs:`, Object.keys(obj.attributes || {}));
            }
            if (obj.type === 'DatetimeTicker' || obj.name === 'DatetimeTicker') {
                console.log(`    has tickers attr:`, 'tickers' in (obj.attributes || {}));
                if (obj.attributes?.tickers) {
                    console.log(`    tickers:`, obj.attributes.tickers.map(t => t.name || t.type));
                }
            }
        }
    });
}
