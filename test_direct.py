import pandas as pd
from bokeh.plotting import figure, output_file
from bokeh.models import MonthsTicker, DatetimeTicker
from bokeh.embed import file_html
from bokeh.resources import CDN
from io import StringIO

output_file("repro.html")

csv = """
y,Date
1,2025-02-12T11:01:53.000000+0000
2,2025-02-12T11:48:53.000000+0000
3,2025-02-12T12:38:39.000000+0000
4,2025-02-12T14:40:00.000000+0000
5,2025-02-12T15:03:53.000000+0000
6,2025-02-12T16:27:24.000000+0000
7,2025-02-12T17:39:23.000000+0000
8,2025-02-12T19:57:08.000000+0000
9,2025-02-13T05:56:50.000000+0000
10,2025-02-13T07:50:44.000000+0000
"""

df = pd.read_csv(StringIO(csv))
df["Date"] = pd.to_datetime(df["Date"], utc=True)

p = figure(
    title="Evolution",
    x_axis_label="Date",
    x_axis_type="datetime",
)

p.line(df["Date"], df["y"])

WITH_COMPOSITE_TICKER = True

if WITH_COMPOSITE_TICKER:
    p.xaxis.ticker = DatetimeTicker(
        tickers=[MonthsTicker(months=list(range(1, 13)))]
    )
else:
    p.xaxis.ticker = MonthsTicker(months=list(range(1, 13)))

# 使用本地构建的 BokehJS 资源
import os

# 使用绝对路径的资源
bokeh_js_path = "bokehjs/build/js/bokeh.min.js"
if os.path.exists(bokeh_js_path):
    print(f"Using local BokehJS: {bokeh_js_path}")
    # 读取并嵌入本地 BokehJS
    with open(bokeh_js_path, "r") as f:
        bokeh_js = f.read()
    with open("bokehjs/build/js/bokeh.min.js.map", "r") as f:
        bokeh_js_map = f.read()
    resources = CDN
else:
    print("Using CDN resources")
    resources = CDN

html = file_html(p, resources, "test")
with open("test_repro.html", "w") as f:
    f.write(html)
print("HTML written to test_repro.html")

# 同时生成使用 MonthsTicker 的版本用于对比
p2 = figure(
    title="Evolution (Direct MonthsTicker)",
    x_axis_label="Date",
    x_axis_type="datetime",
)
p2.line(df["Date"], df["y"])
p2.xaxis.ticker = MonthsTicker(months=list(range(1, 13)))

html2 = file_html(p2, resources, "test2")
with open("test_repro_direct.html", "w") as f:
    f.write(html2)
print("HTML written to test_repro_direct.html (direct, should work)")
