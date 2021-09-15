const FLOAT_PRECISION = 4

const MAIN_PANEL_WIDTH = 1
const CONSOLE_PANEL_WIDTH = 1
const OBSERVER_PANEL_WIDTH = 0.1

const OBSERVER_PANEL_COLOR = Color3.Gray()

const DEBUGGER_HIT_PANEL_COLOR = Color3.Red()
const HIGHLITE_HIT_PANEL_COLOR = Color3.Purple()

const MESH_BADGE_LINK_X_OFFSET_IN_PIXELS = -200
const MESH_BADGE_LINK_Y_OFFSET_IN_PIXELS = -200

const CONSOLE_PANEL_ALPHA = 0.4
const MAIN_PANEL_ALPHA = 0.4
const LINES_ALPHA = 0.4

const MAX_CONSOLE_ENTITIES = 10
const CONSOLE_LINE_HEIGHT_IN_PIXELS = 14
const CONSOLE_PANEL_HEIGHT_IN_PIXELS = MAX_CONSOLE_ENTITIES * CONSOLE_LINE_HEIGHT_IN_PIXELS

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AbstractMesh, Color3, Color4, Engine, Scene, Vector2, Vector3 } from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'

enum LoggedEntityType {
  Text,
  Float,
  Boolean,
  Mesh,
  Vector2,
  Vector3,
  Color3,
  Color4
}

enum Side {
  Left,
  Right
}

interface LoggedEntityTypeMapping {
  color: Color3
  drawFunction: (entity: LoggedEntity) => void
  width?: number
}

interface LoggedEntityOption {
  docked?: boolean
  console?: boolean
  mapping?: LoggedEntityTypeMapping
}
export class LoggedEntity {
  public linkedWithMesh?: boolean
  public textInputs: GUI.InputText[] = []
  public debugWhen?: (value: any) => boolean
  public highliteWhen?: (value: any) => boolean
  public refreshRate = 1

  public getObject<T>() {
    if (this.property) {
      return <T>this.source[this.property]
    }
    return <T>this.source
  }

  public getLinkedMesh() {
    return this.getObject<AbstractMesh>()
  }

  public get isDocked() {
    return this.options.docked
  }

  public get isLinkedWithMesh() {
    return this.linkedWithMesh
  }

  public debug(debugWhen?: (value: any) => boolean) {
    this.debugWhen = debugWhen
    return this
  }

  public highlite(highliteWhen?: (value: any) => boolean) {
    this.highliteWhen = highliteWhen
    return this
  }

  constructor(public name: string, public type: LoggedEntityType, public source: any, public property: string, public options: LoggedEntityOption) {}
}

export class VisualConsole {
  private static instance: VisualConsole

  public static create(engine: Engine, scene: Scene, gui?: GUI.AdvancedDynamicTexture) {
    VisualConsole.instance = new VisualConsole(engine, scene, gui)
    return VisualConsole.instance
  }

  public static log0(object: any, property = '') {
    const name = 'default'
    return VisualConsole.instance?._log0(name, object, property, 1)
  }

  public static log(name: string, object: any, property = '') {
    return VisualConsole.instance?._log(name, object, property, 1)
  }
  public static log5(name: string, object: any, property = '') {
    return VisualConsole.instance?._log(name, object, property, 5)
  }
  public static log30(name: string, object: any, property = '') {
    return VisualConsole.instance?._log(name, object, property, 30)
  }
  public static log60(name: string, object: any, property = '') {
    return VisualConsole.instance?._log(name, object, property, 60)
  }
  public static log120(name: string, object: any, property = '') {
    return VisualConsole.instance?._log(name, object, property, 120)
  }

  // floating
  public static logf(name: string, object: any, property = '') {
    return VisualConsole.instance?._logf(name, object, property, 1)
  }
  public static logf5(name: string, object: any, property = '') {
    return VisualConsole.instance?._logf(name, object, property, 5)
  }
  public static logf30(name: string, object: any, property = '') {
    return VisualConsole.instance?._logf(name, object, property, 30)
  }
  public static logf60(name: string, object: any, property = '') {
    return VisualConsole.instance?._logf(name, object, property, 60)
  }
  public static logf120(name: string, object: any, property = '') {
    return VisualConsole.instance?._logf(name, object, property, 120)
  }

  //

  private _entities = new Map<string, LoggedEntity>()
  private _consoleEntities: LoggedEntity[] = []
  private _consoleLineControls: GUI.InputText[] = []
  private _entityTypeMappings = new Map<LoggedEntityType, LoggedEntityTypeMapping>()
  private _mainPanel!: GUI.StackPanel
  private _consolePanel!: GUI.StackPanel | GUI.ScrollViewer
  private _buttonPanel!: GUI.StackPanel
  private _scrollViewer!: GUI.ScrollViewer
  private _side: Side = Side.Right
  private _ticks = 0

  constructor(private _engine: Engine, private _scene: Scene, private _gui?: GUI.AdvancedDynamicTexture) {
    this._gui = this._gui ?? GUI.AdvancedDynamicTexture.CreateFullscreenUI('VisualConsoleUI', true, this._scene)

    this._createMappings()
    this._createMainPanel()
    this._createConsolePanel()

    this._createButtons()

    this._scene.onBeforeRenderObservable.add(() => {
      this._draw()
      this._offsetInPixelsIfSceneExplorer()
    })
  }

  private _createMappings() {
    const entityTypeMappings = new Map<LoggedEntityType, LoggedEntityTypeMapping>()

    entityTypeMappings.set(LoggedEntityType.Text, {
      color: new Color3(0.4, 0.4, 0.4),
      drawFunction: entity => this._drawText(entity)
    })
    entityTypeMappings.set(LoggedEntityType.Float, {
      color: new Color3(0.6, 0.6, 0.9),
      drawFunction: entity => this._drawFloat(entity)
    })
    entityTypeMappings.set(LoggedEntityType.Boolean, {
      color: new Color3(0.9, 0.6, 0.6),
      drawFunction: entity => this._drawBoolean(entity)
    })
    entityTypeMappings.set(LoggedEntityType.Mesh, {
      color: new Color3(0.0, 0.1, 0.7),
      drawFunction: entity => this._drawMesh(entity)
    })
    entityTypeMappings.set(LoggedEntityType.Vector2, {
      color: new Color3(0.0, 0.7, 0.1),
      drawFunction: entity => this._drawVector2(entity)
    })
    entityTypeMappings.set(LoggedEntityType.Vector3, {
      color: new Color3(0.0, 0.7, 0.1),
      drawFunction: entity => this._drawVector3(entity),
      width: 0.4
    })
    entityTypeMappings.set(LoggedEntityType.Color3, {
      color: new Color3(0.0, 0.0, 0.0),
      drawFunction: entity => this._drawColor3(entity)
    })
    entityTypeMappings.set(LoggedEntityType.Color4, {
      color: new Color3(0.0, 0.0, 0.0),
      drawFunction: entity => this._drawColor4(entity)
    })
    this._entityTypeMappings = entityTypeMappings
  }

  private _drawText(entity: LoggedEntity) {
    if (entity.textInputs) {
      entity.textInputs[0].text = VisualConsole._getObject<string>(entity)
    }
  }

  private _drawFloat(entity: LoggedEntity) {
    if (entity.textInputs) {
      entity.textInputs[0].text = VisualConsole._getObject<number>(entity).toString()
    }
  }

  private _drawBoolean(entity: LoggedEntity) {
    if (entity.textInputs) {
      entity.textInputs[0].text = VisualConsole._getObject<boolean>(entity).toString()
    }
  }

  private _drawMesh(entity: LoggedEntity) {
    if (entity.textInputs) {
      const obj = VisualConsole._getObject<AbstractMesh>(entity)
      entity.textInputs[0].text = `${obj.position.x.toFixed(FLOAT_PRECISION)}, ${obj.position.y.toFixed(FLOAT_PRECISION)}, ${obj.position.z.toFixed(
        FLOAT_PRECISION
      )} `
      entity.textInputs[1].text = `${obj.rotation.x.toFixed(FLOAT_PRECISION)}, ${obj.rotation.y.toFixed(FLOAT_PRECISION)}, ${obj.rotation.z.toFixed(
        FLOAT_PRECISION
      )} `
      entity.textInputs[2].text = `${obj.scaling.x.toFixed(FLOAT_PRECISION)}, ${obj.scaling.y.toFixed(FLOAT_PRECISION)}, ${obj.scaling.z.toFixed(
        FLOAT_PRECISION
      )} `
    }
  }

  private _drawVector2(entity: LoggedEntity) {
    if (entity.textInputs) {
      const obj = VisualConsole._getObject<Vector2>(entity)
      entity.textInputs[0].text = `${obj.x.toFixed(FLOAT_PRECISION)}, ${obj.y.toFixed(FLOAT_PRECISION)}`
    }
  }

  private _drawVector3(entity: LoggedEntity) {
    if (entity.textInputs) {
      const obj = VisualConsole._getObject<Vector3>(entity)
      entity.textInputs[0].text = `${obj.x.toFixed(FLOAT_PRECISION)}, ${obj.y.toFixed(FLOAT_PRECISION)}, ${obj.z.toFixed(FLOAT_PRECISION)}`
    }
  }

  private _drawColor3(entity: LoggedEntity) {
    if (entity.textInputs) {
      const obj = VisualConsole._getObject<Color3>(entity)
      entity.textInputs[0].text = `${obj.r.toFixed(FLOAT_PRECISION)}, ${obj.g.toFixed(FLOAT_PRECISION)}, ${obj.b.toFixed(FLOAT_PRECISION)}`
      this._setColorEntityColor(entity.name, obj)
    }
  }

  private _drawColor4(entity: LoggedEntity) {
    if (entity.textInputs) {
      const obj = VisualConsole._getObject<Color4>(entity)
      entity.textInputs[0].text = `${obj.r.toFixed(FLOAT_PRECISION)}, ${obj.g.toFixed(FLOAT_PRECISION)}, ${obj.b.toFixed(FLOAT_PRECISION)}, , ${obj.a.toFixed(
        FLOAT_PRECISION
      )}`
      this._setColorEntityColor(entity.name, obj)
    }
  }

  // Visual Console private methods

  private _offsetInPixelsIfSceneExplorer() {
    const sceneExplorerHost = document.getElementById('sceneExplorer')
    const inspectorHost = document.getElementById('actionTabs')
    const sceneExplorerOffset = sceneExplorerHost?.clientWidth ?? 0
    const inspectorOffset = inspectorHost?.clientWidth ?? 0
    this._mainPanel.paddingRightInPixels = 0
    this._mainPanel.paddingLeftInPixels = 0
    if (this._side === Side.Left && sceneExplorerHost) {
      this._mainPanel.paddingLeftInPixels = sceneExplorerOffset
      this._mainPanel.paddingRightInPixels = 0
    } else if (this._side === Side.Right && inspectorHost) {
      this._mainPanel.paddingLeftInPixels = 0
      this._mainPanel.paddingRightInPixels = inspectorOffset
    }
  }

  private _createConsolePanel() {
    if (this._gui) {
      const scrollViewer = new GUI.ScrollViewer()
      this._scrollViewer = scrollViewer

      scrollViewer.thickness = 0
      scrollViewer.alpha = CONSOLE_PANEL_ALPHA
      scrollViewer.width = CONSOLE_PANEL_WIDTH
      scrollViewer.topInPixels = this._engine.getRenderHeight(true) / 2 - CONSOLE_PANEL_HEIGHT_IN_PIXELS - 20
      scrollViewer.heightInPixels = CONSOLE_PANEL_HEIGHT_IN_PIXELS
      // scrollViewer.background = '#003'

      // scrollViewer.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_LEFT
      // scrollViewer.verticalAlignment = GUI.StackPanel.VERTICAL_ALIGNMENT_BOTTOM

      scrollViewer.forceVerticalBar = true

      const consolePanel = new GUI.StackPanel()
      this._consolePanel = consolePanel
      consolePanel.name = 'visualconsole-console-panel'
      // consolePanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_LEFT
      // consolePanel.verticalAlignment = GUI.StackPanel.VERTICAL_ALIGNMENT_BOTTOM
      // consolePanel.width = 1
      // consolePanel.height = 1
      // consolePanel.background = '#666'
      consolePanel.paddingBottomInPixels = 4
      consolePanel.zIndex = 1
      consolePanel.alpha = MAIN_PANEL_ALPHA

      this._createConsoleLines(consolePanel)

      this._gui.addControl(scrollViewer)
      scrollViewer.addControl(consolePanel)
    }
  }

  private _createMainPanel() {
    this._mainPanel = new GUI.StackPanel('visualconsole-mainPanel')
    this._mainPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_RIGHT
    this._mainPanel.verticalAlignment = GUI.StackPanel.VERTICAL_ALIGNMENT_TOP
    this._mainPanel.width = MAIN_PANEL_WIDTH
    // this._mainPanel.height = 1
    this._gui?.addControl(this._mainPanel)
  }

  private _createButtons() {
    const buttonPanel = new GUI.StackPanel('visualconsole-buttonPanel')
    buttonPanel.isVertical = false

    buttonPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_RIGHT
    buttonPanel.verticalAlignment = GUI.StackPanel.VERTICAL_ALIGNMENT_TOP
    buttonPanel.widthInPixels = 60
    buttonPanel.heightInPixels = 40
    this._buttonPanel = buttonPanel
    this._mainPanel.addControl(buttonPanel)

    this._createSideToggleButton(buttonPanel)
    this._createInspectorButton(buttonPanel)
  }

  private _createInspectorButton(parent: GUI.StackPanel) {
    const toLeft = GUI.Button.CreateSimpleButton('visualconsole-butttonInspectorToggle', 'D')
    toLeft.width = '24px'
    toLeft.height = '24px'
    toLeft.color = 'white'
    toLeft.fontSize = 12
    toLeft.background = 'orange'
    toLeft.horizontalAlignment = GUI.Button.HORIZONTAL_ALIGNMENT_RIGHT
    toLeft.onPointerUpObservable.add(() => {
      const isVisible = this._scene.debugLayer.isVisible()
      if (isVisible) {
        void this._scene.debugLayer.hide()
      } else {
        void this._scene.debugLayer.show({
          embedMode: false,
          overlay: true
        })
      }
      // this._scene.debugLayer.select();
    })
    parent.addControl(toLeft)
  }

  private _createSideToggleButton(parent: GUI.StackPanel) {
    const toLeft = GUI.Button.CreateSimpleButton('visualconsole-buttonSideToggle', '>')
    toLeft.widthInPixels = 28
    toLeft.heightInPixels = 24
    toLeft.color = 'white'
    toLeft.fontSize = 12
    toLeft.background = '#444'
    toLeft.rotation = Math.PI
    toLeft.paddingRightInPixels = 4
    toLeft.horizontalAlignment = GUI.Button.HORIZONTAL_ALIGNMENT_RIGHT
    toLeft.onPointerUpObservable.add(() => {
      const existingControls = this._gui?.getDescendants()
      if (this._side === Side.Left) {
        toLeft.rotation = Math.PI
        toLeft.horizontalAlignment = GUI.Button.HORIZONTAL_ALIGNMENT_RIGHT
        this._mainPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_RIGHT
        this._buttonPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_RIGHT
      } else {
        toLeft.rotation = 0

        toLeft.horizontalAlignment = GUI.Button.HORIZONTAL_ALIGNMENT_LEFT
        this._mainPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_LEFT
        this._buttonPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_LEFT
      }
      this._entities.forEach(e => {
        if (e.options.docked) {
          const panel = existingControls?.find(c => c.name == `visualconsole-panel-${e.name}`)
          if (panel) {
            if (this._side === Side.Left) {
              panel.horizontalAlignment = GUI.TextBlock.HORIZONTAL_ALIGNMENT_RIGHT
            } else {
              panel.horizontalAlignment = GUI.TextBlock.HORIZONTAL_ALIGNMENT_LEFT
            }
          }
        }
      })
      this._side = this._side === Side.Left ? Side.Right : Side.Left
    })

    parent.addControl(toLeft)
  }

  private _addObjectEntity(name: string, object: any, property: string, options: LoggedEntityOption) {
    let type = LoggedEntityType.Text
    let inputCount = 1
    const value = property !== '' ? object[property] : object
    const objType = typeof value
    if (objType === 'object') {
      if (value instanceof Vector3) {
        type = LoggedEntityType.Vector3
      } else if (value instanceof Color3) {
        type = LoggedEntityType.Color3
      } else if (value instanceof AbstractMesh) {
        type = LoggedEntityType.Mesh
        inputCount = 3
      }
    } else if (objType === 'string') {
      type = LoggedEntityType.Text
    } else if (objType === 'number') {
      type = LoggedEntityType.Float
    } else if (objType === 'boolean') {
      type = LoggedEntityType.Boolean
    }

    const DEFAULT_MAPPING = {
      color: new Color3(0.4, 0.4, 0.4),
      drawFunction: (e: LoggedEntity) => this._drawText(e)
    }

    const mapping = this._entityTypeMappings.get(type) ?? DEFAULT_MAPPING
    options.mapping = mapping
    const entity: LoggedEntity = new LoggedEntity(name, type, object, property, options)
    if (options.console === true) {
      this._addConsoleLine(entity)
    } else {
      this._entities.set(name, entity)
      this._addObserverFrame(entity, inputCount)
    }

    return entity
  }

  private _log0(name: string, object: any, property: string, refreshRate: number) {
    const docked = true
    const entity = this._addObjectEntity(name, object, property, { docked, console: true })
    entity.refreshRate = refreshRate
    return entity
  }

  private _log(name: string, object: any, property: string, refreshRate: number) {
    const docked = true
    let entity = this._entities.get(name)
    if (!entity) {
      entity = this._addObjectEntity(name, object, property, { docked, console: false })
    } else {
      entity.source = object
      entity.property = property
      entity.options.docked = docked
    }
    entity.refreshRate = refreshRate
    return entity
  }

  private _logf(name: string, object: any, property: string, refreshRate: number) {
    const docked = false
    let entity = this._entities.get(name)
    if (!entity) {
      entity = this._addObjectEntity(name, object, property, { docked, console: false })
    } else {
      entity.source = object
      entity.property = property
      entity.options.docked = docked
    }
    entity.refreshRate = refreshRate

    return entity
  }

  private _setColorEntityColor(key: string, color: Color3 | Color4) {
    const existingControls = this._gui!.getDescendants()
    const control = existingControls.find(c => c.name === `visualconsole-panel-${key}`)
    if (control instanceof GUI.StackPanel) {
      control.background = `rgb(${color.r * 255},${color.g * 255},${color.b * 255})`
    }
  }

  private static _getObject<T>(entity: LoggedEntity) {
    if (entity.property) {
      return <T>entity.source[entity.property]
    }
    return <T>entity.source
  }

  private _draw() {
    if (!this._gui) {
      return
    }

    this._drawConsole()

    this._entities.forEach(e => {
      if (this._ticks % e.refreshRate === 0) {
        const drawFunction = this._entityTypeMappings.get(e.type)?.drawFunction
        if (drawFunction) {
          drawFunction(e)
        }
      }
      const val = e.getObject()
      if (e.debugWhen && e.debugWhen(val)) {
        this._setColorEntityColor(e.name, DEBUGGER_HIT_PANEL_COLOR)
        debugger
      }
      if (e.highliteWhen && e.highliteWhen(val)) {
        this._setColorEntityColor(e.name, HIGHLITE_HIT_PANEL_COLOR)
      }
    })

    this._ticks++
  }

  private _drawConsole() {
    if (this._gui) {
      const linesCount = this._consoleEntities.length
      const controlsCount = this._consoleLineControls.length
      const drawCount = Math.min(controlsCount, linesCount)
      if (drawCount === 0) {
        this._scrollViewer.isVisible = false
      }
      for (let i = 0; i < drawCount; i++) {
        const lineControl = this._consoleLineControls[MAX_CONSOLE_ENTITIES - 1 - i]
        lineControl.text = this._consoleEntities[linesCount - i - 1].getObject()
      }

      //this._scrollViewer.verticalBar.value = 1
    }
  }

  private _createConsoleLines(consolePanel: GUI.StackPanel) {
    if (this._gui) {
      for (let i = 0; i < MAX_CONSOLE_ENTITIES; i++) {
        const textValue = new GUI.InputText()
        textValue.width = 1
        textValue.heightInPixels = CONSOLE_LINE_HEIGHT_IN_PIXELS
        textValue.thickness = 0
        textValue.text = ''
        textValue.color = 'white'
        textValue.fontSize = 12
        textValue.name = `visualconsole-line-${i}`
        consolePanel.addControl(textValue)
        this._consoleLineControls.push(textValue)
      }

      // const color = this._entityTypeMappings.get(entity.type)?.color ?? OBSERVER_PANEL_COLOR
      // this._setColorEntityColor(entity.name, color)
    }
  }

  private _addConsoleLine(entity: LoggedEntity) {
    if (this._consoleEntities.length >= MAX_CONSOLE_ENTITIES) {
      this._consoleEntities.shift()
    }
    this._consoleEntities.push(entity)
  }

  private _addObserverFrame(entity: LoggedEntity, inputCount = 1) {
    if (this._gui) {
      const parentPanel = new GUI.StackPanel()
      parentPanel.name = `visualconsole-panel-${entity.name}`
      parentPanel.horizontalAlignment = GUI.StackPanel.HORIZONTAL_ALIGNMENT_RIGHT
      parentPanel.verticalAlignment = GUI.StackPanel.VERTICAL_ALIGNMENT_TOP
      parentPanel.width = entity.options.mapping?.width ?? OBSERVER_PANEL_WIDTH
      parentPanel._automaticSize = true
      parentPanel.background = '#666'
      parentPanel.paddingBottomInPixels = 4
      parentPanel.zIndex = 1
      parentPanel.alpha = MAIN_PANEL_ALPHA

      if (!entity.isDocked) {
        this._gui.addControl(parentPanel)

        const mesh = entity.getLinkedMesh()
        if (mesh) {
          parentPanel.linkWithMesh(mesh)
          entity.linkedWithMesh = true
        }

        parentPanel.paddingTopInPixels = 0

        const line = new GUI.Line(`line-${entity.name}`)
        line.lineWidth = 2
        line.dash = [3, 3]
        line.color = 'white'
        line.y2 = 20
        line.zIndex = 0
        line.linkOffsetY = -20
        line.alpha = LINES_ALPHA
        this._gui.addControl(line)
        line.linkWithMesh(mesh)
        line.connectedControl = parentPanel

        parentPanel.linkOffsetX = MESH_BADGE_LINK_X_OFFSET_IN_PIXELS
        parentPanel.linkOffsetY = MESH_BADGE_LINK_Y_OFFSET_IN_PIXELS
      }

      const textLabel = new GUI.TextBlock()
      textLabel.paddingBottomInPixels = 2
      textLabel.paddingTopInPixels = 2
      textLabel.paddingLeftInPixels = 2
      textLabel.paddingRightInPixels = 2
      textLabel.text = entity.name
      textLabel.color = 'white'
      textLabel.fontSize = 12
      textLabel.resizeToFit = true
      textLabel.name = `visualconsole-textLabel-${entity.name}`
      textLabel.horizontalAlignment = GUI.TextBlock.HORIZONTAL_ALIGNMENT_LEFT
      parentPanel.addControl(textLabel)

      for (let i = 0; i < inputCount; i++) {
        const textValue = new GUI.InputText()
        textValue.width = 0.98
        textValue.height = '24px'
        textValue.text = ''
        textValue.color = 'white'
        textValue.background = '#222'
        textValue.fontSize = 12
        textValue.name = `visualconsole-textValue-${entity.name}-${i}`
        textValue.horizontalAlignment = GUI.TextBlock.HORIZONTAL_ALIGNMENT_CENTER
        entity.textInputs.push(textValue)
        parentPanel.addControl(textValue)
      }

      if (entity.isDocked) {
        this._mainPanel.addControl(parentPanel)
      }

      const color = this._entityTypeMappings.get(entity.type)?.color ?? OBSERVER_PANEL_COLOR
      this._setColorEntityColor(entity.name, color)
    }
  }
}
