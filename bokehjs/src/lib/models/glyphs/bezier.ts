import {LineVector} from "core/property_mixins"
import type * as visuals from "core/visuals"
import type {Rect} from "core/types"
import type {SpatialIndex} from "core/util/spatial"
import type {Context2d} from "core/util/canvas"
import {Glyph, GlyphView} from "./glyph"
import {generic_line_vector_legend} from "./utils"
import {inplace} from "core/util/projections"
import * as p from "core/properties"
import {PI} from "core/util/math"
import {CubicBezier} from "core/util/curves"

export interface BezierView extends Bezier.Data {}

export class BezierView extends GlyphView {
  declare model: Bezier
  declare visuals: Bezier.Visuals

  protected override _project_data(): void {
    inplace.project_xy(this.x0, this.y0)
    inplace.project_xy(this.x1, this.y1)
  }

  protected _index_data(index: SpatialIndex): void {
    const {data_size, x0, y0, x1, y1, cx0, cy0, cx1, cy1} = this

    for (let i = 0; i < data_size; i++) {
      const x0_i = x0[i]
      const y0_i = y0[i]
      const x1_i = x1[i]
      const y1_i = y1[i]
      const cx0_i = cx0[i]
      const cy0_i = cy0[i]
      const cx1_i = cx1[i]
      const cy1_i = cy1[i]

      if (!isFinite(x0_i + x1_i + y0_i + y1_i + cx0_i + cy0_i + cx1_i + cy1_i)) {
        index.add_empty()
      } else {
        const curve = new CubicBezier(x0_i, y0_i, x1_i, y1_i, cx0_i, cy0_i, cx1_i, cy1_i)
        const {x0, y0, x1, y1} = curve.bounding_box()
        index.add_rect(x0, y0, x1, y1)
      }
    }
  }

  protected _render(ctx: Context2d, indices: number[], data?: Bezier.Data): void {
    const {sx0, sy0, sx1, sy1, scx0, scy0, scx1, scy1} = {...this, ...data}

    for (const i of indices) {
      const sx0_i = sx0[i]
      const sy0_i = sy0[i]
      const sx1_i = sx1[i]
      const sy1_i = sy1[i]
      const scx0_i = scx0[i]
      const scy0_i = scy0[i]
      const scx1_i = scx1[i]
      const scy1_i = scy1[i]

      if (!isFinite(sx0_i + sy0_i + sx1_i + sy1_i + scx0_i + scy0_i + scx1_i + scy1_i)) {
        continue
      }

      if (this.visuals.line.doit) {
        ctx.beginPath()
        ctx.moveTo(sx0_i, sy0_i)
        ctx.bezierCurveTo(scx0_i, scy0_i, scx1_i, scy1_i, sx1_i, sy1_i)
        this.visuals.line.apply(ctx, i)
      }

      if (this.has_decorations) {
        const curve = new CubicBezier(sx0_i, sy0_i, sx1_i, sy1_i, scx0_i, scy0_i, scx1_i, scy1_i)
        this._render_decorations(ctx, i, curve)
      }
    }
  }

  protected _render_decorations(ctx: Context2d, i: number, curve: CubicBezier): void {
    for (const decoration of this.decorations.values()) {
      const {sx, sy, angle} = (() => {
        switch (decoration.model.node) {
          case "start": {
            const {x0: sx, y0: sy} = curve
            const angle = curve.tangent(0.0) + PI/2 + PI
            return {sx, sy, angle}
          }
          case "middle": {
            const [sx, sy] = curve.evaluate(0.5)
            const angle = curve.tangent(0.5) + PI/2
            return {sx, sy, angle}
          }
          case "end": {
            const {x1: sx, y1: sy} = curve
            const angle = curve.tangent(1.0) + PI/2
            return {sx, sy, angle}
          }
        }
      })()

      ctx.translate(sx, sy)
      ctx.rotate(angle)
      decoration.marking.render(ctx, i)
      ctx.rotate(-angle)
      ctx.translate(-sx, -sy)
    }
  }

  override draw_legend_for_index(ctx: Context2d, bbox: Rect, index: number): void {
    generic_line_vector_legend(this.visuals, ctx, bbox, index)
  }

  scenterxy(i: number): [number, number] {
    const sx0_i = this.sx0[i]
    const sy0_i = this.sy0[i]
    const sx1_i = this.sx1[i]
    const sy1_i = this.sy1[i]
    const scx0_i = this.scx0[i]
    const scy0_i = this.scy0[i]
    const scx1_i = this.scx1[i]
    const scy1_i = this.scy1[i]
    const curve = new CubicBezier(sx0_i, sy0_i, sx1_i, sy1_i, scx0_i, scy0_i, scx1_i, scy1_i)
    return curve.evaluate(0.5)
  }
}

export namespace Bezier {
  export type Attrs = p.AttrsOf<Props>

  export type Props = Glyph.Props & {
    x0: p.CoordinateSpec
    y0: p.CoordinateSpec
    x1: p.CoordinateSpec
    y1: p.CoordinateSpec
    cx0: p.CoordinateSpec
    cy0: p.CoordinateSpec
    cx1: p.CoordinateSpec
    cy1: p.CoordinateSpec
  } & Mixins

  export type Mixins = LineVector

  export type Visuals = Glyph.Visuals & {line: visuals.LineVector}

  export type Data = p.GlyphDataOf<Props>
}

export interface Bezier extends Bezier.Attrs {}

export class Bezier extends Glyph {
  declare properties: Bezier.Props
  declare __view_type__: BezierView

  constructor(attrs?: Partial<Bezier.Attrs>) {
    super(attrs)
  }

  static {
    this.prototype.default_view = BezierView

    this.define<Bezier.Props>(({}) => ({
      x0:  [ p.XCoordinateSpec, {field: "x0"} ],
      y0:  [ p.YCoordinateSpec, {field: "y0"} ],
      x1:  [ p.XCoordinateSpec, {field: "x1"} ],
      y1:  [ p.YCoordinateSpec, {field: "y1"} ],
      cx0: [ p.XCoordinateSpec, {field: "cx0"} ],
      cy0: [ p.YCoordinateSpec, {field: "cy0"} ],
      cx1: [ p.XCoordinateSpec, {field: "cx1"} ],
      cy1: [ p.YCoordinateSpec, {field: "cy1"} ],
    }))
    this.mixins<Bezier.Mixins>(LineVector)
  }
}
