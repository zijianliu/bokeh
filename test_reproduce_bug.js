// 模拟延迟初始化场景下的问题

// 关键问题分析：
// 1. 在延迟初始化(deferred)模式下，对象先创建但属性不初始化
// 2. CompositeTicker 的 min_intervals getter 遍历 tickers
// 3. 调用每个 ticker 的 get_min_interval() -> 返回 this.interval
// 4. 访问 interval 会触发其 getter -> this.properties["interval"].get_value()
// 5. 如果 interval 还没初始化，它会尝试计算默认值
// 6. 在计算默认值时访问 obj.months -> 但 months 可能也没初始化！

const fs = require('fs');
const path = require('path');

// 让我们模拟属性初始化的顺序问题
console.log('='.repeat(60));
console.log('属性访问器的链式触发');
console.log('='.repeat(60));

console.log(`
访问链:
CompositeTicker.min_intervals
  -> this.tickers.map(t => t.get_min_interval())
     -> ticker.get_min_interval() = ticker.interval
        -> ticker.interval getter = this.properties["interval"].get_value()
           -> 如果 interval._value === unset
              -> 调用 prop.initialize(unset)
                 -> 调用 this.default_value(this.obj)
                    -> default_value 函数: (obj) => { const {months} = obj; ... }
                       -> obj.months getter = this.properties["months"].get_value()
                          -> 如果 months._value === unset
                             -> 抛出 UnsetValueError!
`);

console.log('='.repeat(60));
console.log('为什么只有在 CompositeTicker 中才会发生？');
console.log('='.repeat(60));

console.log(`
直接使用 MonthsTicker:
  - 调用构造函数 -> 立即初始化属性
  - initialize_props() 按顺序初始化所有属性
  - months 先初始化, interval 后初始化
  - 当 interval 计算默认值时, months 已有值

在 CompositeTicker 中使用(序列化/反序列化场景):
  - MonthsTicker 通过延迟(deferred)模式创建
  - 只设置了 id, 属性未初始化
  - CompositeTicker 在自己初始化时可能访问 tickers[0].interval
  - 此时 MonthsTicker 的属性还未初始化
  - interval 的默认值计算尝试访问 months, 但 months 也未初始化
  - 抛出错误 -> 页面空白!
`);

// 让我们检查属性的 syncable 属性
console.log('='.repeat(60));
console.log('关键发现: internal vs syncable');
console.log('='.repeat(60));

const propContent = fs.readFileSync('/Users/mac/github/bokeh/bokehjs/src/lib/core/properties.ts', 'utf8');
const syncableMatch = propContent.match(/get syncable\(\): boolean \{[\s\S]*?\}/);
if (syncableMatch) {
    console.log('syncable getter:');
    console.log(syncableMatch[0]);
}

console.log(`
这意味着:
- internal = true 的属性(如 interval) -> syncable = false
- serialize 方法只序列化 syncable 属性
- JSON 中只包含 months, 不包含 interval
- 当从 JSON 反序列化时, interval 需要重新计算
`);

// 检查反序列化初始化流程
console.log('='.repeat(60));
console.log('检查 Document 反序列化初始化流程');
console.log('='.repeat(60));

const hasPropsContent = fs.readFileSync('/Users/mac/github/bokeh/bokehjs/src/lib/core/has_props.ts', 'utf8');
const assertInitMatch = hasPropsContent.match(/assert_initialized\(\): void \{[\s\S]*?\}/);
if (assertInitMatch) {
    console.log('assert_initialized:');
    console.log(assertInitMatch[0]);
}

console.log(`
问题: assert_initialized 只检查 syncable && !readonly 属性
interval 是 internal -> syncable = false -> 不被检查!

所以 MonthsTicker 可以通过 assert_initialized 检查,
即使 interval 属性从未被访问/初始化过!

当 CompositeTicker 访问 ticker.interval 时:
  - MonthsTicker 看起来已初始化
  - 但 interval 是第一次被访问
  - interval 尝试计算默认值, 访问 months
  - months 可能因为某些原因也没初始化
  - CRASH!
`);
