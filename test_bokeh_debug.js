// 直接测试 bokehjs
const path = require('path');
const fs = require('fs');

// 让我们直接测试构建的 bokehjs
const bokehPath = '/Users/mac/github/bokeh/bokehjs/build/js/lib';

// 首先看看是否可以直接导入
try {
    // 先检查结构
    const indexPath = path.join(bokehPath, 'models/tickers/months_ticker.js');
    if (fs.existsSync(indexPath)) {
        console.log('找到 months_ticker.js');
        
        // 读取文件看结构
        const content = fs.readFileSync(indexPath, 'utf8');
        console.log('文件大小:', content.length, 'bytes');
        
        // 查看导出内容
        const exportMatch = content.match(/export\s+(var|let|const)\s+MonthsTicker\s*=|export\s+\{\s*MonthsTicker\s*\}/);
        console.log('导出模式:', exportMatch ? exportMatch[0] : '未找到');
    }
} catch(e) {
    console.log('错误:', e.message);
}

// 让我们用另一种方法：检查生成的 JS 代码中属性顺序
console.log('\n' + '='.repeat(60));
console.log('关键假设验证');
console.log('='.repeat(60));

// 1. 测试：当访问一个未初始化的属性时会发生什么？
console.log('\n[测试1] 访问未初始化属性的行为');
console.log('在 properties.ts 中:');
console.log('  get_value():');
console.log('    if (this._value !== unset) { return this._value }');
console.log('    else { throw new UnsetValueError(...) }');
console.log('');
console.log('  -> 如果访问一个没有初始化的属性，会抛出 UnsetValueError');

// 2. 测试：interval 属性的 default_value 函数会访问 obj.months
console.log('\n[测试2] interval default_value 函数');
console.log('(obj) => {');
console.log('  const {months} = obj  <-- 这会调用 obj.months getter');
console.log('  ...');
console.log('}');
console.log('');
console.log('obj.months getter 调用: this.properties["months"].get_value()');
console.log('');
console.log('  -> 如果 months 还没初始化，get_value() 会抛出 UnsetValueError!');

// 3. 这是否就是问题？
console.log('\n[问题可能性分析]');
console.log('情况 A: interval 在 months 前初始化');
console.log('  - 初始化 interval');
console.log('  - 调用 default_value(this.obj)');
console.log('  - default_value 函数访问 obj.months');
console.log('  - 调用 this.properties["months"].get_value()');
console.log('  - months._value 是 unset (还没初始化)');
console.log('  - 抛出 UnsetValueError');
console.log('  - 页面崩溃 -> 空白!');
console.log('');
console.log('情况 B: interval 在 months 后初始化');
console.log('  - 一切正常 :)');

// 4. 那为什么直接使用 MonthsTicker 没有问题？
console.log('\n[为什么直接使用 MonthsTicker 没有问题？]');
console.log('当直接使用 MonthsTicker 时:');
console.log('  1. MonthsTicker 被创建并初始化');
console.log('  2. 它的属性按顺序初始化');
console.log('  3. 初始化完成后才被使用');
console.log('  -> 当其他代码访问 .interval 时，所有属性已就绪');
console.log('');
console.log('当在 CompositeTicker/DatetimeTicker 中使用时:');
console.log('  1. CompositeTicker 初始化');
console.log('  2. 某些 getter (比如 min_intervals)');
console.log('     可能在 MonthsTicker 完全初始化前访问 tickers');
console.log('  -> 或者 MonthsTicker 的属性初始化顺序有问题!');

// 5. 验证 MonthsTicker 的属性顺序
console.log('\n' + '='.repeat(60));
console.log('验证 _props 属性顺序');
console.log('='.repeat(60));

const mtTs = fs.readFileSync('/Users/mac/github/bokeh/bokehjs/src/lib/models/tickers/months_ticker.ts', 'utf8');

// 检查 MonthsTicker 的 static 初始化块
const staticMatch = mtTs.match(/static \{\s*([\s\S]*?this\.define[\s\S]*?this\.internal[\s\S]*?)\s*\}/);
if (staticMatch) {
    console.log('MonthsTicker static 初始化块:');
    const lines = staticMatch[1].trim().split('\n').slice(0, 15);
    lines.forEach(line => console.log('  ' + line.trim()));
    console.log('  ...');
}

// 现在让我们构建 bokehjs 并进行实际测试
console.log('\n' + '='.repeat(60));
console.log('构建 bokehjs 并测试');
console.log('='.repeat(60));

const { execSync } = require('child_process');
try {
    console.log('编译 bokehjs (快速检查)...');
    // 使用 npm run build 或类似命令
    const result = execSync('cd /Users/mac/github/bokeh/bokehjs && npm run build:compile 2>&1 | tail -20', { encoding: 'utf8', timeout: 60000 });
    console.log('构建结果:', result);
} catch(e) {
    console.log('构建输出(部分):', e.stdout?.toString()?.slice(-1000) || '无输出');
    console.log('构建错误:', e.message);
}
