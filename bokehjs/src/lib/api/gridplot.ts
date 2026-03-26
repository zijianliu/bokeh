import {GridPlot, Plot} from "../models/plots"
import type {Tool} from "../models/tools/tool"
import type {ToolLike} from "../models/tools/tool_proxy"
import {ToolProxy} from "../models/tools/tool_proxy"
import {SaveTool} from "../models/tools/actions/save_tool"
import {CopyTool} from "../models/tools/actions/copy_tool"
import {ExamineTool} from "../models/tools/actions/examine_tool"
import {FullscreenTool} from "../models/tools/actions/fullscreen_tool"
import {Toolbar} from "../models/tools/toolbar"
import {UIElement} from "../models/ui/ui_element"
import {LayoutDOM} from "../models/layouts/layout_dom"
import type {SizingMode, Location} from "../core/enums"
import {Matrix} from "../core/util/matrix"
import {is_equal} from "../core/util/eq"
import {last} from "../core/util/array"
import type {Attrs} from "../core/types"
import {isArrayOf} from "../core/util/types"

// 工具合并策略：对于共享工具，创建新实例以避免冲突
function _merge_shared_tools(_cls: typeof Tool, group: Tool[]): Tool | ToolProxy<Tool> | null {
  const tool = group[0]
  if (tool instanceof SaveTool) {
    return new SaveTool()
  } else if (tool instanceof CopyTool) {
    return new CopyTool()
  } else if (tool instanceof ExamineTool) {
    return new ExamineTool()
  } else if (tool instanceof FullscreenTool) {
    return new FullscreenTool()
  } else {
    return null
  }
}

// 验证并提取唯一的工具栏属性值
function _assert_unique_toolbar_property<T>(values: T[], property_name: string): T | undefined {
  const unique_count = new Set(values).size
  if (unique_count == 0) {
    return undefined
  } else if (unique_count > 1) {
    console.warn(`found multiple competing values for 'toolbar.${property_name}' property; using the latest value`)
  }
  return last(values)
}

// 从子图矩阵中提取有效的网格项和工具栏
function _extract_grid_items(matrix: Matrix<GridPlotItem>, merge_tools: boolean,
    options: {width?: number, height?: number}): {
  items: [UIElement, number, number][]
  toolbars: Toolbar[]
} {
  const items: [UIElement, number, number][] = []
  const toolbars: Toolbar[] = []

  for (const [item, row, col] of matrix) {
    if (item == null) {
      continue
    }

    if (item instanceof Plot) {
      if (merge_tools) {
        toolbars.push(item.toolbar)
        item.toolbar_location = null
      }
    }

    if (item instanceof LayoutDOM) {
      if (options.width != null) {
        item.width = options.width
      }
      if (options.height != null) {
        item.height = options.height
      }
    }

    items.push([item, row, col])
  }

  return {items, toolbars}
}

// 从多个工具栏收集所有工具
function _collect_tools_from_toolbars(toolbars: Toolbar[], merge_tools: boolean): ToolLike<Tool>[] {
  const tools: ToolLike<Tool>[] = []

  for (const toolbar of toolbars) {
    tools.push(...toolbar.tools)
  }

  if (merge_tools) {
    return group_tools(tools, _merge_shared_tools)
  } else {
    return tools
  }
}

// 从多个工具栏合并属性（取最后一个非唯一值）
function _merge_toolbar_properties(toolbars: Toolbar[]): {
  logo: Toolbar.Attrs["logo"] | undefined
  autohide: Toolbar.Attrs["autohide"] | undefined
  active_drag: Toolbar.Attrs["active_drag"] | undefined
  active_inspect: Toolbar.Attrs["active_inspect"] | undefined
  active_scroll: Toolbar.Attrs["active_scroll"] | undefined
  active_tap: Toolbar.Attrs["active_tap"] | undefined
  active_multi: Toolbar.Attrs["active_multi"] | undefined
} {
  const logos = toolbars.map((toolbar) => toolbar.logo)
  const autohides = toolbars.map((toolbar) => toolbar.autohide)
  const active_drags = toolbars.map((toolbar) => toolbar.active_drag)
  const active_inspects = toolbars.map((toolbar) => toolbar.active_inspect)
  const active_scrolls = toolbars.map((toolbar) => toolbar.active_scroll)
  const active_taps = toolbars.map((toolbar) => toolbar.active_tap)
  const active_multis = toolbars.map((toolbar) => toolbar.active_multi)

  return {
    logo: _assert_unique_toolbar_property(logos, "logo"),
    autohide: _assert_unique_toolbar_property(autohides, "autohide"),
    active_drag: _assert_unique_toolbar_property(active_drags, "active_drag"),
    active_inspect: _assert_unique_toolbar_property(active_inspects, "active_inspect"),
    active_scroll: _assert_unique_toolbar_property(active_scrolls, "active_scroll"),
    active_tap: _assert_unique_toolbar_property(active_taps, "active_tap"),
    active_multi: _assert_unique_toolbar_property(active_multis, "active_multi"),
  }
}

export type GridPlotOpts = {
  toolbar_location?: Location | null
  merge_tools?: boolean
  sizing_mode?: SizingMode
  width?: number
  height?: number
}

export type MergeFn = (cls: typeof Tool, group: Tool[]) => Tool | ToolProxy<Tool> | null

export function group_tools(tools: ToolLike<Tool>[], merge?: MergeFn,
    ignore: Set<string> = new Set(["overlay", "renderers"])): ToolLike<Tool>[] {

  type ToolEntry = {tool: Tool, attrs: Attrs}
  const by_type: Map<typeof Tool, Set<ToolEntry>> = new Map()

  const computed: ToolLike<Tool>[] = []

  for (const tool of tools) {
    if (tool instanceof ToolProxy) {
      computed.push(tool)
    } else {
      const attrs = tool.attributes
      for (const attr of ignore) {
        if (attr in attrs) {
          delete attrs[attr]
        }
      }

      const proto = tool.constructor.prototype
      let values = by_type.get(proto)
      if (values == null) {
        by_type.set(proto, values=new Set())
      }
      values.add({tool, attrs})
    }
  }

  for (const [cls, entries] of by_type.entries()) {
    if (merge != null) {
      const merged = merge(cls, [...entries].map((entry) => entry.tool))
      if (merged != null) {
        computed.push(merged)
        continue
      }
    }

    while (entries.size != 0) {
      const [head, ...tail] = entries
      entries.delete(head)

      const group = [head.tool]
      for (const item of tail) {
        if (is_equal(item.attrs, head.attrs)) {
          group.push(item.tool)
          entries.delete(item)
        }
      }

      if (group.length == 1) {
        computed.push(group[0])
      } else {
        const merged = merge?.(cls, group)
        computed.push(merged ?? new ToolProxy({tools: group}))
      }
    }
  }

  return computed
}

export type GridPlotItem = UIElement | null | undefined

// 将 children 转换为矩阵格式
function _create_grid_matrix(children: GridPlotItem[] | GridPlotItem[][] | Matrix<GridPlotItem>,
    ncols?: number): Matrix<GridPlotItem> {
  const has_array = isArrayOf(children, (c) => c == null || c instanceof UIElement)
  const has_ncols = ncols != null

  if (has_array && has_ncols) {
    return Matrix.from(children, ncols)
  } else if (!has_array && !has_ncols) {
    return Matrix.from(children)
  } else {
    throw new Error("gridplot() expects an array of UIElement | null when ncols is set")
  }
}

// 创建合并后的工具栏
function _create_merged_toolbar(toolbars: Toolbar[], merge_tools: boolean): Toolbar {
  const tools = _collect_tools_from_toolbars(toolbars, merge_tools)
  const toolbar_props = _merge_toolbar_properties(toolbars)

  return new Toolbar({
    tools,
    ...toolbar_props,
    // TODO ...toolbar_options,
  })
}

export function gridplot(children: GridPlotItem[], options: GridPlotOpts & {ncols: number}): GridPlot
export function gridplot(children: GridPlotItem[][], options?: GridPlotOpts): GridPlot

export function gridplot(children: GridPlotItem[] | GridPlotItem[][] | Matrix<GridPlotItem>,
    options: GridPlotOpts & {ncols?: number, width?: number, height?: number} = {}): GridPlot {
  const {
    toolbar_location,
    merge_tools = true,
    sizing_mode,
    ncols,
    width,
    height,
  } = options

  // 步骤1：创建网格矩阵
  const matrix = _create_grid_matrix(children, ncols)

  // 步骤2：提取网格项和工具栏
  const {items, toolbars} = _extract_grid_items(matrix, merge_tools, {width, height})

  // 步骤3：创建合并的工具栏（如果需要合并工具）
  const toolbar = _create_merged_toolbar(toolbars, merge_tools)

  // 步骤4：创建 GridPlot
  return new GridPlot({
    children: items,
    toolbar,
    toolbar_location,
    sizing_mode,
  })
}
