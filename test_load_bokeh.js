// 尝试在 Node.js 中加载 BokehJS 并模拟错误
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 读取 BokehJS
const bokehJS = fs.readFileSync('bokehjs/build/js/bokeh.min.js', 'utf8');

// 读取 HTML 中的 docs_json
const htmlContent = fs.readFileSync('test_repro.html', 'utf8');
const docsJsonMatch = htmlContent.match(/docs_json = '([^']+)'/);
const renderItemsMatch = htmlContent.match(/render_items = '([^']+)'/);

if (!docsJsonMatch || !renderItemsMatch) {
    console.log('未能提取 JSON 数据');
    process.exit(1);
}

let docsJson = docsJsonMatch[1];
let renderItems = renderItemsMatch[1];

// 清理转义字符
docsJson = docsJson.replace(/\\x3C/g, '<');
docsJson = docsJson.replace(/\\'/g, "'");
docsJson = docsJson.replace(/\\"/g, '"');

renderItems = renderItems.replace(/\\x3C/g, '<');
renderItems = renderItems.replace(/\\'/g, "'");
renderItems = renderItems.replace(/\\"/g, '"');

console.log('=== Bokeh 初始化测试 ===');
console.log('docs_json 解析成功:', docsJson.length > 0);
console.log('render_items 解析成功:', renderItems.length > 0);

// 从 JSON 中提取 MonthsTicker 数据
const docs = JSON.parse(docsJson);
const docId = Object.keys(docs)[0];

// 查找 MonthsTicker 数据
let monthsTickerData = null;
const findMonthsTicker = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.name === 'MonthsTicker' || obj.type === 'MonthsTicker') {
        monthsTickerData = obj;
        return;
    }
    for (const key in obj) {
        findMonthsTicker(obj[key]);
    }
};
findMonthsTicker(docs);

console.log('\nMonthsTicker 数据:');
console.log('  ID:', monthsTickerData?.id);
console.log('  attributes:', Object.keys(monthsTickerData?.attributes || {}));
console.log('  months:', monthsTickerData?.attributes?.months);

// 现在我们需要分析 BokehJS 的初始化流程
// 让我们查看初始化时可能调用的关键函数

console.log('\n=== 分析 MonthsTicker 的初始化代码 ===');

// 查看我们的修复
const mtSource = fs.readFileSync('bokehjs/src/lib/models/tickers/months_ticker.ts', 'utf8');
const intervalMatch = mtSource.match(/this\.internal[^]*?interval[^]*?ONE_MONTH/);
if (intervalMatch) {
    console.log('当前 interval 定义:');
    const lines = intervalMatch[0].split('\n').slice(0, 20);
    lines.forEach((line, i) => {
        console.log(`  ${i + 1}: ${line}`);
    });
}

// 检查 property.ts 中的 _value 字段是否正确可访问
const propSource = fs.readFileSync('bokehjs/src/lib/core/properties.ts', 'utf8');
console.log('\nProperty 类字段可见性:');
const matches = [
    {pattern: /_value[^:]*:/g, name: '_value 定义'},
    {pattern: /_unset[^:]*:/g, name: '_unset 定义'},
    {pattern: /public /g, name: 'public 字段'},
    {pattern: /protected /g, name: 'protected 字段'},
    {pattern: /private /g, name: 'private 字段'},
];
matches.forEach(m => {
    const found = [...propSource.matchAll(m.pattern)];
    console.log(`  ${m.name}: 找到 ${found.length} 处`);
    if (found.length > 0 && found.length < 5) {
        found.forEach(f => {
            const context = propSource.slice(f.index - 10, f.index + 30);
            console.log(`    上下文: ${context.replace(/\n/g, ' ')}`);
        });
    }
});
