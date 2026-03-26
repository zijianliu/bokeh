// 模拟属性初始化顺序问题

// 1. 假设 _props 的顺序是: num_minor_ticks, desired_num_ticks, months, interval
const propsOrder = ['num_minor_ticks', 'desired_num_ticks', 'months', 'interval'];

// 2. 模拟从 Python 端接收到的 attributes (internal 属性不会被序列化)
const receivedAttrs = {
    months: [1,2,3,4,5,6,7,8,9,10,11,12]
    // 注意: interval 不在其中，因为它是 internal 属性
};

console.log('=== 属性初始化顺序模拟 ===');
console.log('Props order:', propsOrder);
console.log('Received attrs:', Object.keys(receivedAttrs));

// 3. 模拟初始化过程
const propertyValues = {};

// 模拟 interval 的默认值函数
function intervalDefaultValue(obj) {
    console.log('  [intervalDefaultValue] 被调用');
    console.log('  [intervalDefaultValue] obj 属性:', Object.keys(obj));
    console.log('  [intervalDefaultValue] obj.propertyValues:', Object.keys(obj.propertyValues));
    console.log('  [intervalDefaultValue] 尝试访问 obj.months:', obj.months);
    console.log('  [intervalDefaultValue] 尝试访问 obj.propertyValues.months:', obj.propertyValues.months);
    
    // 关键问题: obj 上是否有 months 属性?
    const months = obj.months;  // 通过 getter 访问
    console.log('  [intervalDefaultValue] months value:', months);
    return (months && months.length > 1 ? months[1] - months[0] : 12) * 2592000000;
}

const mockObj = {
    propertyValues: propertyValues,
    
    get months() {
        console.log('    [months getter] 被调用');
        return this.propertyValues.months;
    },
    
    get interval() {
        console.log('    [interval getter] 被调用');
        return this.propertyValues.interval;
    }
};

// 模拟遍历初始化 (this 对象还在构建中)
console.log('\n=== 开始初始化 ===');

for (const propName of propsOrder) {
    console.log(`\n处理属性: ${propName}`);
    
    if (propName in receivedAttrs) {
        console.log(`  从 receivedAttrs 设置: ${receivedAttrs[propName]}`);
        propertyValues[propName] = receivedAttrs[propName];
    } else if (propName === 'interval') {
        console.log(`  interval 是 internal 属性，调用默认值函数`);
        // 调用默认值函数，传入 mockObj
        try {
            const defaultValue = intervalDefaultValue(mockObj);
            console.log(`  默认值函数返回: ${defaultValue}`);
            propertyValues[propName] = defaultValue;
        } catch(e) {
            console.log(`  错误: ${e.message}`);
            console.log(`  错误堆栈: ${e.stack}`);
        }
    } else {
        // 其他属性使用简单默认值
        console.log(`  设置默认值: 5 (假设)`);
        propertyValues[propName] = propName === 'num_minor_ticks' ? 5 : 6;
    }
    
    console.log(`  propertyValues now: ${Object.keys(propertyValues)}`);
}

console.log('\n=== 初始化完成 ===');
console.log('最终 months:', propertyValues.months);
console.log('最终 interval:', propertyValues.interval);
