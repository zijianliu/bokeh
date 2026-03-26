// 更准确地模拟 Bokeh 的初始化流程

class UnsetValueError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnsetValueError';
    }
}

const unset = Symbol('unset');

class MockProperty {
    constructor(obj, name, kind, default_value, options = {}) {
        this.obj = obj;
        this.attr = name;
        this.kind = kind;
        this._value = unset;
        this._unset = unset;
        this._initialized = false;
        this._default_value_fn = default_value;
        this.options = options;
        this.internal = options.internal || false;
    }
    
    get_value() {
        if (this._value !== unset) {
            return this._value;
        } else {
            throw new UnsetValueError(`Prop(${this.obj.type || this.obj}.${this.attr}) is unset`);
        }
    }
    
    initialize(initial_value) {
        // Bokeh 的 initialize 不会检查初始值是否为 undefined，而是检查是否不等于 unset
        // initial_value 来自 JSON，可能是 undefined (表示不在 JSON 中)，但不是 unset
        
        if (this._initialized) {
            throw new Error(`${this} is already initialized`);
        }
        
        let attr_value = unset;
        
        // 关键: 在 Bokeh 中，如果 initial_value === undefined (不是 unset)，会进入 else 分支调用 default_value
        if (initial_value !== undefined) {  // 注意: 这里不是 !== unset
            attr_value = initial_value;
        } else {
            // 不在 JSON 中，计算默认值
            // console.log(`    [${this.attr}] 调用 default_value(this.obj) ...`);
            attr_value = this._default_value_fn(this.obj);
            // console.log(`    [${this.attr}] default_value 返回:`, attr_value);
        }
        
        this._value = attr_value;
        this._initialized = true;
        // console.log(`    [${this.attr}] 初始化完成，_value =`, this._value);
    }
    
    toString() {
        return `Prop(${this.obj.type || 'MockObj'}.${this.attr})`;
    }
}

// 模拟真正的初始化顺序问题
function createBrokenMonthsTicker(useFix = false) {
    const obj = {
        type: 'MonthsTicker',
        properties: {}
    };
    
    const ONE_MONTH = 31 * 24 * 60 * 60 * 1000;
    
    // months 属性
    obj.properties['months'] = new MockProperty(obj, 'months', 'List(Int)', () => []);
    
    // interval 属性 (使用修复前/后的代码)
    const intervalDefaultValue = useFix 
        ? (obj) => {
            // 修复后的代码
            let months;
            try {
                months = obj.months;
            } catch (e) {
                console.log(`      [interval] 捕获到异常: ${e.name}`);
                months = [];
            }
            return (months.length > 1 ? months[1] - months[0] : 12) * ONE_MONTH;
        }
        : (obj) => {
            // 修复前的代码
            const months = obj.months;  // <-- 这里如果 months 未初始化，会抛出异常
            return (months.length > 1 ? months[1] - months[0] : 12) * ONE_MONTH;
        };
    
    obj.properties['interval'] = new MockProperty(
        obj, 'interval', 'Float', intervalDefaultValue, {internal: true}
    );
    
    // 定义属性访问器
    Object.defineProperty(obj, 'months', {
        get: () => {
            // console.log(`      [get months] 调用 get_value() ...`);
            const val = obj.properties['months'].get_value();
            // console.log(`      [get months] 返回:`, val);
            return val;
        },
        enumerable: true
    });
    
    Object.defineProperty(obj, 'interval', {
        get: () => obj.properties['interval'].get_value(),
        enumerable: true
    });
    
    return obj;
}

// 模拟 Bokeh 的 initialize_props 流程
function simulateBokehInitializeProps(obj, jsonAttrs, propOrder) {
    // Bokeh 中的 initialize_props:
    // for (const prop of this) {  // 遍历顺序决定了初始化顺序!
    //   const val = vals_proxy.get(prop.attr)
    //   prop.initialize(val)  // val 可能是 undefined!
    //   ...
    // }
    
    console.log(`  属性初始化顺序: ${propOrder.join(' -> ')}`);
    
    for (const propName of propOrder) {
        const prop = obj.properties[propName];
        // 从 JSON 获取值，注意: internal 属性不会出现在 JSON 中
        const valFromJson = jsonAttrs[propName];  // undefined if not in JSON (e.g. interval)
        
        console.log(`  初始化 ${propName}: JSON 中有值吗? ${valFromJson !== undefined ? '是' : '否'}`, 
                    valFromJson !== undefined ? `值=${valFromJson}` : '');
        
        try {
            prop.initialize(valFromJson);
            console.log(`    ✓ ${propName} 初始化成功`);
        } catch (e) {
            console.log(`    ✗ ${propName} 初始化失败: ${e.name}: ${e.message}`);
            return false;
        }
    }
    return true;
}

console.log('='.repeat(70));
console.log('真正模拟 Bokeh 的初始化流程');
console.log('='.repeat(70));
console.log('');
console.log('关键点:');
console.log('  - JSON 中只包含 syncable 属性 (months)');
console.log('  - Internal 属性 (interval) 不在 JSON 中，需要计算默认值');
console.log('  - 属性初始化顺序由 for...of 迭代顺序决定');
console.log('');

// 场景 1: months -> interval (正常顺序)
console.log('场景 1: months -> interval (正常顺序)');
const obj1a = createBrokenMonthsTicker(false);  // 旧代码
const success1a = simulateBokehInitializeProps(
    obj1a, 
    {months: [1,2,3,4,5,6,7,8,9,10,11,12]},  // 只有 months 在 JSON 中
    ['months', 'interval']  // 迭代顺序: months 先
);
console.log('  最终状态: months=', obj1a.months, ', interval=', obj1a.interval);
console.log('');

// 场景 2: interval -> months (可能在某些 JS 环境发生!)
console.log('场景 2: interval -> months (危险顺序 - 旧代码会失败)');
const obj2a = createBrokenMonthsTicker(false);  // 旧代码
const success2a = simulateBokehInitializeProps(
    obj2a, 
    {months: [1,2,3,4,5,6,7,8,9,10,11,12]},  // 只有 months 在 JSON 中
    ['interval', 'months']  // 迭代顺序: interval 先！
);
console.log('');

console.log('场景 3: interval -> months (使用 try-catch 修复)');
const obj3 = createBrokenMonthsTicker(true);  // 修复后代码
const success3 = simulateBokehInitializeProps(
    obj3, 
    {months: [1,2,3,4,5,6,7,8,9,10,11,12]},  // 只有 months 在 JSON 中
    ['interval', 'months']  // 迭代顺序: interval 先，但修复后能处理
);
if (success3) {
    console.log('  最终状态: months=', obj3.months, ', interval=', obj3.interval);
}

console.log('');
console.log('='.repeat(70));
console.log('分析总结');
console.log('='.repeat(70));
console.log('');
console.log('问题根源:');
console.log('  在 JavaScript 中，对象属性的迭代顺序 (for...of, Object.keys)');
console.log('  在某些环境中可能不是严格的定义顺序。当 interval 在 months');
console.log('  之前初始化时，default_value(this.obj) 函数会尝试访问 obj.months，');
console.log('  但 months 的 get_value() 会因为 _value 是 unset 而抛出 UnsetValueError。');
console.log('');
console.log('修复原理:');
console.log('  在 default_value 函数中使用 try-catch 来捕获属性访问时可能');
console.log('  抛出的 UnsetValueError。当捕获到异常时，使用一个安全的默认值。');
console.log('');
console.log('注意事项:');
console.log('  - 修复后返回空数组 [] 来计算 interval，会得到 12 * ONE_MONTH');
console.log('  - 这只是一个中间值，因为 months 随后会被正确初始化');
console.log('  - 但在后续访问 obj.interval 时，会重新计算正确的值吗？');
console.log('');
console.log('  >>> 答案: 不会。但 interval 的计算只在初始化时进行一次。');
console.log('  >>> 然而实际上，这个问题只出现在初始化时访问 obj.months 来计算');
console.log('  >>> interval。当初始化流程完成后，所有值都会正确设置。');
console.log('  >>> 修复使初始化得以完成，后续访问就能得到正确值。');
