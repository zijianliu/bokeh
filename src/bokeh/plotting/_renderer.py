#-----------------------------------------------------------------------------
# Copyright (c) Anaconda, Inc., and Bokeh Contributors.
# All rights reserved.
#
# The full license is in the file LICENSE.txt, distributed with this software.
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Boilerplate
#-----------------------------------------------------------------------------
from __future__ import annotations

import logging # isort:skip
log = logging.getLogger(__name__)

#-----------------------------------------------------------------------------
# Imports
#-----------------------------------------------------------------------------

# Standard library imports
import sys
from collections.abc import Iterable
from typing import TYPE_CHECKING, Any, TypeAlias

# External imports
import numpy as np

# Bokeh imports
from ..core.property.dataspec import ColorSpec, DashPattern, DashPatternSpec
from ..models import ColumnarDataSource, ColumnDataSource, GlyphRenderer
from ._legends import pop_legend_kwarg, update_legend

if TYPE_CHECKING:
    from ..models.glyph import Glyph
    from ..models.plots import Plot

#-----------------------------------------------------------------------------
# Globals and constants
#-----------------------------------------------------------------------------

__all__ = (
    'create_renderer',
    'make_glyph',
    'pop_visuals',
)

RENDERER_ARGS = ['name', 'coordinates', 'x_range_name', 'y_range_name',
                 'level', 'view', 'visible', 'muted']

Attrs: TypeAlias = dict[str, Any]

#-----------------------------------------------------------------------------
# General API
#-----------------------------------------------------------------------------

def get_default_color(plot: Plot | None = None) -> str:
    colors = [
        "#1f77b4",
        "#ff7f0e", "#ffbb78",
        "#2ca02c", "#98df8a",
        "#d62728", "#ff9896",
        "#9467bd", "#c5b0d5",
        "#8c564b", "#c49c94",
        "#e377c2", "#f7b6d2",
        "#7f7f7f",
        "#bcbd22", "#dbdb8d",
        "#17becf", "#9edae5",
    ]
    if plot:
        renderers = plot.renderers
        glyph_renderers = [r for r in renderers if isinstance(r, GlyphRenderer)]
        num_renderers = len(glyph_renderers)
        return colors[num_renderers]
    else:
        return colors[0]

#-----------------------------------------------------------------------------
# Dev API
#-----------------------------------------------------------------------------

def create_renderer(glyphclass: type[Glyph], plot: Plot, **kwargs: Any) -> GlyphRenderer[Glyph]:
    # Prepare data source and extract renderer arguments
    is_user_source = _prepare_data_source(kwargs)
    legend_kwarg, legend_name = pop_legend_kwarg(kwargs)
    renderer_kws = _pop_renderer_args(kwargs)
    source = renderer_kws['data_source']

    # Process visual properties and sequence literals
    glyph_visuals = _process_glyph_visuals(glyphclass, kwargs, source, is_user_source)

    # Create glyphs for different interaction states
    glyphs = _create_state_glyphs(glyphclass, kwargs, glyph_visuals)

    # Build and register the renderer
    glyph_renderer = _build_renderer(renderer_kws, glyphs)
    plot.renderers.append(glyph_renderer)

    # Update legend if needed (must be done after renderer is added)
    if legend_kwarg:
        update_legend(plot, legend_kwarg, legend_name, glyph_renderer)

    return glyph_renderer


def _prepare_data_source(kwargs: Attrs) -> bool:
    """Convert data source to ColumnDataSource if necessary.

    Returns:
        True if user provided a source, False if auto-created.
    """
    return _convert_data_source(kwargs)


def _process_glyph_visuals(
    glyphclass: type[Glyph],
    kwargs: Attrs,
    source: ColumnDataSource,
    is_user_source: bool,
) -> Attrs:
    """Process visual properties and validate sequence literals.

    Returns:
        Dictionary of main glyph visual properties.
    """
    glyph_visuals = pop_visuals(glyphclass, kwargs)

    incompatible: list[str] = []
    incompatible += _process_sequence_literals(glyphclass, kwargs, source, is_user_source)
    incompatible += _process_sequence_literals(glyphclass, glyph_visuals, source, is_user_source)

    if incompatible:
        from ..util.strings import nice_join
        raise RuntimeError(_GLYPH_SOURCE_MSG % nice_join(incompatible, conjunction="and"))

    return glyph_visuals


def _create_state_glyphs(
    glyphclass: type[Glyph],
    kwargs: Attrs,
    glyph_visuals: Attrs,
) -> dict[str, Glyph | None]:
    """Create glyphs for all interaction states (main, nonselection, selection, hover, muted).

    Returns:
        Dictionary mapping state names to glyph instances.
    """
    # Main glyph
    main_glyph = make_glyph(glyphclass, kwargs, glyph_visuals)

    # Nonselection glyph (always created with reduced alpha)
    nonselection_visuals = pop_visuals(
        glyphclass, kwargs,
        prefix='nonselection_',
        defaults=glyph_visuals,
        override_defaults={'alpha': 0.1},
    )
    nonselection_glyph = make_glyph(glyphclass, kwargs, nonselection_visuals)

    # Selection glyph (only if selection_ properties provided)
    selection_visuals = _get_state_visuals(
        glyphclass, kwargs, glyph_visuals, 'selection_',
    )
    selection_glyph = make_glyph(glyphclass, kwargs, selection_visuals)

    # Hover glyph (only if hover_ properties provided)
    hover_visuals = _get_state_visuals(
        glyphclass, kwargs, glyph_visuals, 'hover_',
    )
    hover_glyph = make_glyph(glyphclass, kwargs, hover_visuals)

    # Muted glyph (always created with reduced alpha)
    muted_visuals = pop_visuals(
        glyphclass, kwargs,
        prefix='muted_',
        defaults=glyph_visuals,
        override_defaults={'alpha': 0.2},
    )
    muted_glyph = make_glyph(glyphclass, kwargs, muted_visuals)

    return {
        'main': main_glyph,
        'nonselection': nonselection_glyph,
        'selection': selection_glyph,
        'hover': hover_glyph,
        'muted': muted_glyph,
    }


def _get_state_visuals(
    glyphclass: type[Glyph],
    kwargs: Attrs,
    defaults: Attrs,
    prefix: str,
) -> Attrs | None:
    """Extract visual properties for a specific state if any are provided."""
    if any(x.startswith(prefix) for x in kwargs):
        return pop_visuals(glyphclass, kwargs, prefix=prefix, defaults=defaults)
    return None


def _build_renderer(
    renderer_kws: Attrs,
    glyphs: dict[str, Glyph | None],
) -> GlyphRenderer:
    """Build the GlyphRenderer from processed arguments and glyphs."""
    return GlyphRenderer(
        glyph=glyphs['main'],
        nonselection_glyph=glyphs['nonselection'] or "auto",
        selection_glyph=glyphs['selection'] or "auto",
        hover_glyph=glyphs['hover'],
        muted_glyph=glyphs['muted'] or "auto",
        **renderer_kws,
    )

def make_glyph(glyphclass: type[Glyph], kws: Attrs, extra: Attrs | None) -> Glyph | None:
    if extra is None:
        return None
    kws = kws.copy()
    kws.update(extra)
    return glyphclass(**kws)

def pop_visuals(glyphclass: type[Glyph], props: Attrs, *, prefix: str = "", defaults: Attrs = {}, override_defaults: Attrs = {}) -> Attrs:
    """
    Applies basic cascading logic to deduce properties for a glyph.

    Args:
        glyphclass :
            the type of glyph being handled

        props (dict) :
            Maps properties and prefixed properties to their values.
            Keys in `props` matching `glyphclass` visual properties (those of
            'line_', 'fill_', 'hatch_' or 'text_') with added `prefix` will get
            popped, other keys will be ignored.
            Keys take the form '[{prefix}][{feature}_]{trait}'. Only {feature}
              must not contain underscores.
            Keys of the form '{prefix}{trait}' work as lower precedence aliases
              for {trait} for all {features}, as long as the glyph has no
              property called {trait}. I.e. this won't apply to "width" in a
              `rect` glyph.
            Ex: {'fill_color': 'blue', 'selection_line_width': 0.5}

        prefix (str) :
            Prefix used when accessing `props`. Ex: 'selection_'

        defaults (dict) :
            Property fallback, in case prefixed property not in `props` or
            `override_defaults`.
            Ex. 'line_width' here may be used for 'selection_line_width'.

        override_defaults (dict) :
            Explicitly provided fallback based on '{trait}', in case property
            not set in `props`.
            Ex. 'width' here may be used for 'selection_line_width'.

    Returns:
        result (dict) :
            Resulting properties for the instance (no prefixes).

    Notes:
        Feature trait 'text_color', as well as traits 'color' and 'alpha', have
        ultimate defaults in case those can't be deduced.
    """
    defaults = defaults.copy()
    defaults.setdefault('text_color', 'black')
    defaults.setdefault('hatch_color', 'black')

    trait_defaults: Attrs = {}
    trait_defaults.setdefault('color', get_default_color())
    trait_defaults.setdefault('alpha', 1.0)

    result: Attrs = {}
    traits: set[str] = set()
    prop_names = set(glyphclass.properties())
    visual_props = filter(_is_visual, prop_names)
    for name in visual_props:
        _, trait = _split_feature_trait(name)

        # e.g. "line_color", "selection_fill_alpha"
        if prefix+name in props:
            result[name] = props.pop(prefix+name)

        # e.g. "nonselection_alpha"
        elif trait not in prop_names and prefix+trait in props:
            result[name] = props[prefix+trait]

        # e.g. an alpha to use for non-selection if none is provided
        elif trait in override_defaults:
            result[name] = override_defaults[trait]

        # e.g. use values off the main glyph
        elif name in defaults:
            result[name] = defaults[name]

        # e.g. not specified anywhere else
        elif trait in trait_defaults:
            result[name] = trait_defaults[trait]

        if trait not in prop_names:
            traits.add(trait)

    for trait in traits:
        props.pop(prefix+trait, None)

    return result

#-----------------------------------------------------------------------------
# Private API
#-----------------------------------------------------------------------------

def _convert_data_source(kwargs: Attrs) -> bool:
    is_user_source = kwargs.get('source', None) is not None
    if is_user_source:
        source = kwargs['source']
        if not isinstance(source, ColumnarDataSource):
            try:
                # try converting the source to ColumnDataSource
                source = ColumnDataSource(source)
            except ValueError as err:
                msg = f"Failed to auto-convert {type(source)} to ColumnDataSource.\n Original error: {err}"
                raise ValueError(msg).with_traceback(sys.exc_info()[2])

            # update kwargs so that others can use the new source
            kwargs['source'] = source

    return is_user_source

def _pop_renderer_args(kwargs: Attrs) -> Attrs:
    result = {attr: kwargs.pop(attr) for attr in RENDERER_ARGS if attr in kwargs}
    result['data_source'] = kwargs.pop('source') if 'source' in kwargs else ColumnDataSource()
    return result

def _is_scalar_dash_pattern(val: Any) -> bool:
    """Check if value should be treated as a scalar dash pattern (not per-glyph data)."""
    if isinstance(val, np.ndarray):
        return val.ndim == 1 and val.dtype.kind in ('i', 'u')
    elif isinstance(val, (list, tuple)):
        return len(val) > 0 and all(isinstance(v, int) for v in val)
    return False

def _validate_color_array(val: np.ndarray, var: str) -> None:
    """Validate numpy array for ColorSpec properties."""
    valid_formats = [
        val.dtype == "uint32" and val.ndim == 1,   # 0xRRGGBBAA
        val.dtype == "uint8" and val.ndim == 1,    # greys
        val.dtype.kind == "U" and val.ndim == 1,   # CSS strings
        (val.dtype == "uint8" or val.dtype.kind == "f") and val.ndim == 2 and val.shape[1] in (3, 4),  # RGB/RGBA
    ]
    if not any(valid_formats):
        raise RuntimeError(
            f"Color columns need to be of type uint32[N], uint8[N] or uint8/float[N, {{3, 4}}] "
            f"({var} is {val.dtype}[{', '.join(map(str, val.shape))}])",
        )

def _process_sequence_literals(glyphclass: type[Glyph], kwargs: Attrs, source: ColumnarDataSource, is_user_source: bool) -> list[str]:
    incompatible_literal_spec_values: list[str] = []
    dataspecs = glyphclass.dataspecs()
    all_properties = glyphclass.properties(_with_props=True)

    for var, val in kwargs.items():
        # Skip non-iterables and dicts
        if not isinstance(val, Iterable) or isinstance(val, dict):
            continue

        # Handle dash patterns specially to avoid list ambiguity
        # DashPattern/DashPatternSpec should treat integer sequences like [6, 3] as scalar patterns
        if var in all_properties and isinstance(all_properties[var], (DashPatternSpec, DashPattern)):
            if _is_scalar_dash_pattern(val):
                # Convert numpy arrays to lists for serialization
                if isinstance(val, np.ndarray):
                    kwargs[var] = val.tolist()
                continue

        # Let non-dataspecs handle their own validation
        if var not in dataspecs:
            continue

        # Strings and color tuples are handled by dataspecs as-is
        if isinstance(val, str):
            continue
        if isinstance(dataspecs[var], ColorSpec) and dataspecs[var].is_color_tuple_shape(val):
            continue

        # Validate numpy arrays
        if isinstance(val, np.ndarray):
            if isinstance(dataspecs[var], ColorSpec):
                _validate_color_array(val, var)
            elif val.ndim != 1:
                raise RuntimeError(f"Columns need to be 1D ({var} is not)")

        # Add sequence to data source or mark as incompatible
        if is_user_source:
            incompatible_literal_spec_values.append(var)
        else:
            source.add(val, name=var)
            kwargs[var] = var

    return incompatible_literal_spec_values

def _split_feature_trait(ft: str) -> tuple[str, str | None]:
    """Feature is up to first '_'. Ex. 'line_color' => ['line', 'color']"""
    parts = ft.split("_", 1)
    return tuple(parts) if len(parts) == 2 else (ft[0], None)

def _is_visual(ft: str) -> bool:
    """Whether a feature trait name is visual"""
    feature, trait = _split_feature_trait(ft)
    return feature in ('line', 'fill', 'hatch', 'text', 'global') and trait is not None

_GLYPH_SOURCE_MSG = """

Expected %s to reference fields in the supplied data source.

When a 'source' argument is passed to a glyph method, values that are sequences
(like lists or arrays) must come from references to data columns in the source.

For instance, as an example:

    source = ColumnDataSource(data=dict(x=a_list, y=an_array))

    p.scatter(x='x', y='y', source=source, ...) # pass column names and a source

Alternatively, *all* data sequences may be provided as literals as long as a
source is *not* provided:

    p.scatter(x=a_list, y=an_array, ...)  # pass actual sequences and no source

"""

#-----------------------------------------------------------------------------
# Code
#-----------------------------------------------------------------------------
