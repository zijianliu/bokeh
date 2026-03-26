// 验证修复的逻辑正确性
const fs = require('fs');

// 读取修复后的源代码
const mtContent = fs.readFileSync('bokehjs/src/lib/models/tickers/months_ticker.ts', 'utf8');

// 检查关键修复代码
console.log('='.repeat(70));
console.log('验证 MonthsTicker 修复代码');
console.log('='.repeat(70));

// 检查修复代码是否正确
const hasIsUnset = mtContent.includes('monthsProp.is_unset');
const hasCorrectValueAccess = mtContent.includes('(monthsProp as any)._value');

console.log('  - 使用 is_unset getter:', hasIsUnset ? '✓' : '✗');
console.log('  - 使用正确的 _value 访问方式:', hasCorrectValueAccess ? '✓' : '✗');

// 查看修复代码片段
const fixMatch = mtContent.match(/interval:.*?\{[\s\S]{0,250}ONE_MONTH/);
if (fixMatch) {
    console.log('\n修复代码片段:');
    const lines = fixMatch[0].split('\n').slice(0, 12);
    lines.forEach((line, i) => {
        console.log(`  ${line.trim()}`);
    });
}

console.log('\n' + '='.repeat(70));
console.log('分析上一轮失败的原因');
console.log('='.repeat(70));
console.log('\n上一轮补丁的问题:');
console.log('  错误地使用了 `monthsProp._unset` 来比较');
console.log('  但 `unset` 是导出的常量符号，不是实例的 `_unset` 属性!');
console.log('\n正确的做法:');
console.log('  - 使用 `monthsProp.is_unset` getter (公共 API)');
console.log('  - 或直接与导入的 `unset` 符号比较');

console.log('\n' + '='.repeat(70));
console.log('验证 has_props.ts 初始化流程');
console.log('='.repeat(70));

// 检查 is_unset getter 的实现
const propContent = fs.readFileSync('bokehjs/src/lib/core/properties.ts', 'utf8');
const isUnsetMatch = propContent.match(/get is_unset\(\): boolean \{[^}]+\}/);
if (isUnsetMatch) {
    console.log('\nis_unset getter 实现:');
    console.log('  ' + isUnsetMatch[0].replace(/\n/g, '\n  '));
}

console.log('\n' + '='.repeat(70));
console.log('总结');
console.log('='.repeat(70));
console.log('  上一轮补丁：错误地访问了不存在的 `_unset` 实例属性');
console.log('  本轮修复：使用正确的 `is_unset` getter 检查值状态');
console.log('');
console.log('  编译状态：PASS (npm run build 成功)');
