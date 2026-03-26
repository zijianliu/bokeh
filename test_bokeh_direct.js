// 使用 Node.js 直接调试 MonthsTicker 初始化

// 首先，让我们看看是否可以从已安装的 bokeh 模块导入
try {
    const bokehPath = '/Users/mac/github/bokeh/bokehjs/build/js/lib';
    console.log('尝试从:', bokehPath, '导入');
    
    // 让我们检查是否有构建好的文件
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync(bokehPath)) {
        console.log('bokehjs build 目录存在');
        
        // 查看 bokehjs 的结构
        const modelsPath = path.join(bokehPath, 'models');
        if (fs.existsSync(modelsPath)) {
            console.log('models 目录存在');
            
            const tickersPath = path.join(modelsPath, 'tickers');
            if (fs.existsSync(tickersPath)) {
                console.log('tickers 目录存在');
                const files = fs.readdirSync(tickersPath);
                console.log('tickers 文件:', files);
            }
        }
    } else {
        console.log('需要先构建 bokehjs');
    }
} catch(e) {
    console.log('错误:', e.message);
}

// 让我们检查 TypeScript 编译是否有效
console.log('\n=== 检查 bokehjs 构建 ===');
const { execSync } = require('child_process');
try {
    const result = execSync('cd /Users/mac/github/bokeh/bokehjs && npx tsc --noEmit 2>&1 | head -20', { encoding: 'utf8' });
    console.log('TypeScript 检查结果:', result);
} catch(e) {
    console.log('TypeScript 检查输出:', e.stdout?.toString().slice(0, 500));
}

// 让我们直接分析源代码来理解问题
console.log('\n=== 源代码分析 ===');
const fs = require('fs');

// 读取 MonthsTicker.ts
const mtContent = fs.readFileSync('/Users/mac/github/bokeh/bokehjs/src/lib/models/tickers/months_ticker.ts', 'utf8');
console.log('MonthsTicker.define 调用:');
const defineMatches = mtContent.match(/this\.define.*?\(\s*\{\s*([^}]+)\s*\}\s*\)/s);
if (defineMatches) {
    console.log('define 内容:', defineMatches[0].slice(0, 200));
}

const internalMatches = mtContent.match(/this\.internal.*?\(\s*\{\s*([^}]+)\s*\}\s*\)/s);
if (internalMatches) {
    console.log('internal 内容:', internalMatches[0].slice(0, 200));
}

// 关键问题: 检查 properties.ts 中 initialize 时默认值函数的调用时机
const propContent = fs.readFileSync('/Users/mac/github/bokeh/bokehjs/src/lib/core/properties.ts', 'utf8');

// 看看 default_value 的调用
console.log('\n=== properties.ts 中的关键代码 ===');
const defaultValLines = propContent.match(/attr_value = this\.default_value\(this\.obj\)[^\n]*/);
if (defaultValLines) {
    console.log('默认值调用:', defaultValLines[0]);
}

// 查找 get_value 的实现，看看是否会动态计算
const getValueLines = propContent.match(/get_value\(\)[\s\S]*?return[\s\S]*?(?=\})/);
if (getValueLines) {
    console.log('get_value 方法:');
    console.log(getValueLines[0].slice(0, 300));
}

// 让我们检查属性初始化时默认值函数中的 this.obj 是否能访问到正确的属性值
console.log('\n=== 假设问题场景 ===');
console.log('当 interval 属性初始化时，调用 this.default_value(this.obj)');
console.log('但此时 months 属性可能还没有被初始化！');
console.log('');
console.log('问题: 为什么直接使用 MonthsTicker 没有问题?');
console.log('答案: 因为当只有一个 MonthsTicker 时，它的属性会在使用前完成初始化');
console.log('');
console.log('问题: 为什么在 CompositeTicker 内部会有问题?');
console.log('答案: 因为 CompositeTicker 的 min_intervals getter 会');
console.log('      在 tickers 数组元素属性初始化完成前访问 ticker.get_min_interval()!');
console.log('');
console.log('让我检查 CompositeTicker 中 min_intervals 的 getter...');

// 查看 CompositeTicker 的 min_intervals
const ctContent = fs.readFileSync('/Users/mac/github/bokeh/bokehjs/src/lib/models/tickers/composite_ticker.ts', 'utf8');
const minIntervalMatch = ctContent.match(/get min_intervals\(\):[\s\S]*?\}/);
if (minIntervalMatch) {
    console.log('\nCompositeTicker min_intervals getter:');
    console.log(minIntervalMatch[0]);
}

// 关键问题: 属性初始化顺序和 getter 访问时机
console.log('\n=== 初始化顺序问题 ===');
console.log('CompositeTicker 初始化顺序:');
console.log('  1. tickers (ArrayProperty) - 创建 MonthsTicker 实例的引用');
console.log('  2. 然后 MonthsTicker 的属性开始初始化...');
console.log('');
console.log('但问题可能是:');
console.log('在反序列化过程中，CompositeTicker 构造完成后，');
console.log('某些代码可能在 MonthsTicker 实例属性初始化完成前就访问了 tickers');
console.log('并调用了 get_min_interval() 来获取 interval');

// 让我们看看属性的实际顺序
console.log('\n=== MonthsTicker 属性顺序 ===');
console.log('属性定义顺序:');
console.log('  1. BaseSingleIntervalTicker 定义的属性');
console.log('  2. months - 通过 this.define');
console.log('  3. interval - 通过 this.internal (调用 this.define)');
console.log('');
console.log('理论上: interval 在 months 之后，所以初始化时 months 应该可用');
console.log('');
console.log('但实际调用: default_value(this.obj)');
console.log('在 default_value 函数内部: (obj) => { const {months} = obj; ... }');
console.log('当访问 obj.months 时，getter 尝试获取 this.properties["months"].get_value()');
console.log('');
console.log('问题可能是: properties["months"] 存在吗？让我调试一下...');

// 检查 prop.initialize 的调用链
console.log('\n=== 初始化调用链 ===');
const propLines = propContent.split('\n').slice(130, 210);
let insideInitialize = false;
let bracketCount = 0;
for (let i = 0; i < propLines.length; i++) {
    const line = propLines[i];
    if (line.includes('initialize(')) {
        insideInitialize = true;
        console.log(`${i+130}: ${line}`);
        bracketCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        continue;
    }
    if (insideInitialize) {
        console.log(`${i+130}: ${line}`);
        bracketCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (bracketCount <= 0 && line.includes('}')) {
            break;
        }
    }
}
