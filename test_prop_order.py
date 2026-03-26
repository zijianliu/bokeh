# 测试 MonthsTicker 在实际序列化中的属性
import json
from bokeh.models import MonthsTicker, CompositeTicker
from bokeh.io import json_items

# 创建对象
mt = MonthsTicker(months=list(range(1, 13)))
ct = CompositeTicker(tickers=[mt])

# 获取序列化内容
items = json_items((ct,))
print("=== Serialized CompositeTicker ===")
print(json.dumps(items, indent=2))

# 查看 MonthsTicker 的实际初始化调用参数
print("\n=== MonthsTicker 内部结构 ===")
print(f"MonthsTicker months: {mt.months}")

# 看看 MonthsTicker 的 _props 属性中是否有 interval
print("\n=== Checking internal attributes ===")
for name, value in mt.__dict__.items():
    if not name.startswith('_'):
        print(f"  {name}: {value}")

# 检查属性设置
print("\n=== Property definitions ===")
if hasattr(mt, '_props'):
    for name, prop in mt._props.items():
        print(f"  {name}: {prop}")
