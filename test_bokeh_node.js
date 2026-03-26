// 在 Node.js 环境中模拟 Bokeh 初始化

// 先提取 docs_json
const fs = require('fs');
const htmlContent = fs.readFileSync('test_repro.html', 'utf8');
const docsJsonMatch = htmlContent.match(/docs_json = '([^']+)'/);

if (docsJsonMatch) {
    const docsJson = docsJsonMatch[1].replace(/\\x3C/g, '<').replace(/\\\\"/g, '\\"').replace(/\\'/g, "'");
    console.log('docs_json 提取成功，长度:', docsJson.length);
    
    // 解析看看结构
    const docs = JSON.parse(docsJson);
    const docId = Object.keys(docs)[0];
    console.log('Doc ID:', docId);
    
    // 查找 ticker 相关对象
    const roots = docs[docId].roots;
    console.log('Roots 结构:', Object.keys(roots));
    
    // 遍历所有 references 查找 ticker
    const findTickers = (obj, path = '') => {
        if (obj && typeof obj === 'object') {
            if (obj.type && obj.type.includes('Ticker')) {
                console.log(`Ticker found: ${obj.type} at ${path}`);
                console.log(`  Attributes:`, Object.keys(obj.attributes || {}));
                if (obj.type === 'MonthsTicker') {
                    console.log(`  Months:`, obj.attributes?.months);
                }
            }
            for (const key in obj) {
                findTickers(obj[key], path + '.' + key);
            }
        }
    };
    findTickers(roots, 'roots');
} else {
    console.log('未能提取 docs_json');
    console.log(htmlContent.slice(0, 2000));
}
