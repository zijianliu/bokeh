// 测试初始化顺序
const obj = {};

// 模拟属性定义顺序
Object.defineProperty(obj, 'num_minor_ticks', {
  get() { console.log('get num_minor_ticks'); return this._num_minor_ticks || 5; },
  set(v) { console.log('set num_minor_ticks to', v); this._num_minor_ticks = v; },
  enumerable: true
});

Object.defineProperty(obj, 'desired_num_ticks', {
  get() { console.log('get desired_num_ticks'); return this._desired_num_ticks || 6; },
  set(v) { console.log('set desired_num_ticks to', v); this._desired_num_ticks = v; },
  enumerable: true
});

Object.defineProperty(obj, 'months', {
  get() { console.log('get months'); return this._months || []; },
  set(v) { console.log('set months to', v); this._months = v; },
  enumerable: true
});

Object.defineProperty(obj, 'interval', {
  get() { 
    console.log('get interval'); 
    const months = this.months;
    console.log('  months value:', months);
    return (months.length > 1 ? months[1] - months[0] : 12) * 2592000000;
  },
  enumerable: true
});

console.log('Object.keys order:', Object.keys(obj));

// 模拟 initialize_props
const vals = { months: [1,2,3,4,5,6,7,8,9,10,11,12] };
const vals_proxy = new Map(Object.entries(vals));

for (const propName of Object.keys(obj)) {
  const val = vals_proxy.get(propName);
  console.log(`\nInitializing ${propName} with val=`, val);
  if (val !== undefined) {
    obj[propName] = val;
  } else {
    // 调用默认值函数，模拟传递 obj
    console.log(`  Using default value for ${propName}, accessing obj...`);
  }
}

console.log('\nFinal state:');
console.log('months:', obj.months);
console.log('interval:', obj.interval);
