import pandas as pd
from bokeh.plotting import figure, show, output_file
from bokeh.models import MonthsTicker, DatetimeTicker
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
