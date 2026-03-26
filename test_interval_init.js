// 测试 MonthsTicker interval 属性初始化问题
const ONE_MONTH = 31 * 24 * 60 * 60 * 1000;

// 模拟 Bokeh 的属性系统
function createMockMonthsTicker(monthsAttr) {
    const _props = {
        // 模拟属性顺序: num_minor_ticks, desired_num_ticks, months, interval
        num_minor_ticks: { default_value: () => 5 },
        desired_num_ticks: { default_value: () => 6 },
        months: { default_value: () => [] },
        interval: { 
            default_value: (obj) => {
                console.log('  [interval default_value] called with obj:', obj);
                console.log('  [interval default_value] obj.months:', obj.months);
                console.log('  [interval default_value] this:', this);
                const months = obj._property_values ? obj._property_values.months : obj.months;
                console.log('  [interval default_value] months value:', months);
                return (months && months.length > 1 ? months[1] - months[0] : 12) * ONE_MONTH;
            }
        }
    };

    const obj = {
        _property_values: {},
        _props: _props,
        
        // 模拟 initialize_props
        initialize_props(vals) {
            console.log('[initialize_props] starting with vals:', vals);
            
            const visited = new Set();
            const propOrder = Object.keys(_props);
            console.log('[initialize_props] prop order:', propOrder);
            
            for (const propName of propOrder) {
                console.log(`\n[initialize_props] processing ${propName}`);
                
                const prop = _props[propName];
                const val = vals[propName];
                
                if (val !== undefined) {
                    console.log(`[initialize_props]   has value in vals:`, val);
                    this._property_values[propName] = val;
                } else {
                    console.log(`[initialize_props]   no value in vals, using default`);
                    // 关键问题: default_value 访问 obj.months，但是 months 可能还没初始化
                    const defaultValue = prop.default_value(this);
                    console.log(`[initialize_props]   default value result:`, defaultValue);
                    this._property_values[propName] = defaultValue;
                }
                
                console.log(`[initialize_props]   _property_values now:`, Object.assign({}, this._property_values));
                visited.add(propName);
            }
        }
    };

    // 定义属性访问器
    for (const propName of Object.keys(_props)) {
        Object.defineProperty(obj, propName, {
            get() { 
                console.log(`  [getter] ${propName}:`, this._property_values[propName]);
                return this._property_values[propName]; 
            },
            set(v) { this._property_values[propName] = v; },
            enumerable: true
        });
    }

    obj.initialize_props(monthsAttr);
    return obj;
}

console.log('=' + '='.repeat(60));
console.log('Test 1: Simulating initialization with months');
console.log('=' + '='.repeat(60));
const mt1 = createMockMonthsTicker({ months: [1,2,3,4,5,6,7,8,9,10,11,12] });
console.log('\nFinal result:');
console.log('  months:', mt1.months);
console.log('  interval:', mt1.interval);

console.log('\n' + '='.repeat(60));
console.log('Test 2: Where the problem REALLY is - in the initialization function!');
console.log('=' + '='.repeat(60));

// 问题可能是: 在默认值函数中，obj 实际上是另一个对象或上下文
// 让我们检查 Bokeh 的实际实现
function checkActualImplementation() {
    console.log('\n[Analysis]');
    console.log('Looking at Bokeh code in months_ticker.ts:');
    console.log('');
    console.log('  this.internal<MonthsTicker.Internal, MonthsTicker>(({Float}) => ({');
    console.log('    interval: [ Float, (obj) => {');
    console.log('      const {months} = obj');
    console.log('      return (months.length > 1 ? months[1] - months[0] : 12)*ONE_MONTH');
    console.log('    } ],');
    console.log('  }))');
    console.log('');
    console.log('The interval default_value function takes (obj) as parameter');
    console.log('BUT WHEN IS THIS FUNCTION CALLED, AND WITH WHAT "obj"?');
}

checkActualImplementation();
