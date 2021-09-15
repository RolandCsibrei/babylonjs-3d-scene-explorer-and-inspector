// Roland Csibrei, 2021

const WIDTH = 1920
const HEIGHT = 1080

const PANEL_WIDTH = 300
const PANEL_HEIGHT = 1080

import {
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Scene,
  Color4,
  CubeTexture,
  Mesh,
  Color3,
  AbstractMesh,
  StandardMaterial,
  Engine,
  Texture,
  MeshBuilder,
  Matrix,
  RawTexture,
  PickingInfo,
  MirrorTexture,
  Nullable,
  TransformNode
} from '@babylonjs/core'
import '@babylonjs/loaders'

import { BaseScene } from './BaseScene'
import { VisualConsole as console3d } from 'src/utils/VisualConsole'
declare global {
  interface MediaDevices {
    getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>
  }

  // if constraints config still lose some prop, you can define it by yourself also
  interface MediaTrackConstraintSet {
    displaySurface?: ConstrainDOMString
    logicalSurface?: ConstrainBoolean
    // more....
  }
}
export class HtmlToTextureScene extends BaseScene {
  private _htmlMesh1: Mesh
  private _htmlMesh2: Mesh
  private _htmlTexture1?: RawTexture
  private _htmlTexture2?: RawTexture
  private _htmlMaterial1: StandardMaterial
  private _htmlMaterial2: StandardMaterial

  private _isCursorOnHtmlPlane1 = false
  private _isCursorOnHtmlPlane2 = false

  private _reflectionTexture?: MirrorTexture
  private _reflectionTextureRenderList: Nullable<AbstractMesh[]> = null

  private get _arcCamera() {
    return <ArcRotateCamera>this._camera
  }

  private _oldSelectedHtmlElement: any

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    console3d.create(this._engine, this._scene)

    const w = PANEL_WIDTH / 100
    const h = PANEL_HEIGHT / 100

    const material1 = new StandardMaterial('htmlMaterial1', this._scene)
    this._htmlMaterial1 = material1
    material1.backFaceCulling = false
    material1.disableLighting = true

    const plane1 = MeshBuilder.CreatePlane('htmlPlane1', { width: w, height: h }, this._scene)
    this._htmlMesh1 = plane1
    // plane1.billboardMode = Mesh.BILLBOARDMODE_ALL
    plane1.position.x = -4
    plane1.isPickable = true
    plane1.material = material1

    const material2 = new StandardMaterial('htmlMaterial2', this._scene)
    this._htmlMaterial2 = material2
    material2.backFaceCulling = false
    material2.disableLighting = true

    //

    const plane2 = MeshBuilder.CreatePlane('htmlPlane2', { width: w, height: h }, this._scene)
    this._htmlMesh2 = plane2
    plane2.billboardMode = Mesh.BILLBOARDMODE_ALL
    plane2.position.x = 4
    plane2.isPickable = true
    plane2.material = material2

    let isCursorOnHtmlPlane = false

    const mouseMove = (e: { offsetX: any; offsetY: any }) => {
      const mouseX = e.offsetX
      const mouseY = e.offsetY
      const fakeCursor = document.getElementById('fake-cursor')

      if (fakeCursor) {
        fakeCursor.style.setProperty('visibility', 'visible')
        if (!this._isCursorOnHtmlPlane1 && !this._isCursorOnHtmlPlane2) {
          fakeCursor.style.setProperty('visibility', 'hidden')
          if (mouseX < PANEL_WIDTH) {
            fakeCursor.style.setProperty('visibility', 'hidden')
            if (mouseX > WIDTH - PANEL_WIDTH) {
              fakeCursor.style.setProperty('visibility', 'hidden')
            }
          }
        }
      }
    }
    window.addEventListener('mousemove', mouseMove, false)

    this._scene.onBeforeRenderObservable.add(() => {
      console3d.log('Mouse X', this._scene.pointerX)
      console3d.log('Mouse Y', this._scene.pointerY)

      const mouseX = this._scene.pointerX
      const mouseY = this._scene.pointerY

      var ray = this._scene.createPickingRay(mouseX, mouseY, Matrix.Identity(), this._arcCamera)

      const hit = this._scene.pickWithRay(ray)

      console3d.log('Hovered 1', this._isCursorOnHtmlPlane1.toString())
      console3d.log('Hovered 2', this._isCursorOnHtmlPlane2.toString())

      let bodyElement = document.getElementsByTagName('body')[0]
      if (this._isCursorOnHtmlPlane1 || this._isCursorOnHtmlPlane2) {
        bodyElement.classList.add('no-cursor')
      } else {
        bodyElement.classList.remove('no-cursor')
      }

      if (hit) {
        this._isCursorOnHtmlPlane1 = hit.pickedMesh?.name === 'htmlPlane1'
        this._isCursorOnHtmlPlane2 = hit.pickedMesh?.name === 'htmlPlane2'

        const element = <HTMLElement>this._getHtmlElementFromPickInfo(hit)

        if (element) {
          if (element.id !== 'fake-cursor') {
            if (this._oldSelectedHtmlElement) {
              this._oldSelectedHtmlElement.style.setProperty('box-shadow', (this._oldSelectedHtmlElement as any).dontdothisnexttime_boxShadow)
            }

            console3d.log('HTML Element', `${element.id !== '' ? '#' + element.id : ''}${element.className !== '' ? '.' + element.className : ''}`)
            if (element.style && (this._isCursorOnHtmlPlane1 || this._isCursorOnHtmlPlane2)) {
              ;(element as any).dontdothisnexttime_boxShadow = element.style.getPropertyValue('box-shadow')
              element.style.setProperty('box-shadow', '0px 0px 10px 5px #0ff', 'important')
            }
            this._oldSelectedHtmlElement = element
          }
        }
      } else {
        isCursorOnHtmlPlane = false
      }
    })

    this._scene.onPointerPick = (e, pickInfo) => {
      const element = this._getHtmlElementFromPickInfo(pickInfo, true)
      if (element) {
        setTimeout(() => {
          // element.dispatchEvent(new MouseEvent('click', { shiftKey: false }))
          // console.log('Click at', e.currentTarget, element, htmlCoordsX, htmlCoordsY)
          // element.parentElement?.click()
          // element.click()
          // element.getRootNode().click()
        }, 100)
      }
    }
  }

  private _positionFakeCursor(htmlX: number, htmlY: number) {
    const marker = document.getElementById('fake-cursor')
    if (marker) {
      marker.style.setProperty('left', `${htmlX}px`)
      marker.style.setProperty('top', `${htmlY}px`)
    }
  }

  private _getHtmlElementFromPickInfo(pickInfo: PickingInfo, simulateClick = false) {
    const cords = pickInfo.getTextureCoordinates()
    if (cords) {
      const offsetX = pickInfo.pickedMesh?.name === 'htmlPlane2' ? -PANEL_WIDTH - 150 : -1920
      const offsetY = 70

      const htmlX = 1920 + offsetX + cords.x * PANEL_WIDTH
      const htmlY = PANEL_HEIGHT - cords.y * PANEL_HEIGHT - 70
      const elements = document.elementsFromPoint(htmlX, htmlY)
      const element = elements[1]
      if (element instanceof HTMLElement) {
        if (simulateClick) {
          // const tree = document.getElementById('tree')
          // debugger
          // if (tree) {
          //   tree.click()
          // }
          this._simulateClick(element, htmlX, htmlY)
        }

        console3d.log('HTML X', htmlX)
        console3d.log('HTML Y', htmlY)

        this._positionFakeCursor(htmlX, htmlY)
      }
      return element
    }
    return null
  }

  private _simulateClick(element: HTMLElement, x: number, y: number) {
    // element.click()

    var evt = document.createEvent('MouseEvents')
    x = 0
    y = 0
    evt.initMouseEvent('click', true, true, window, 0, x, y, x, y, false, false, false, false, 0, null)
    element.dispatchEvent(evt)
    console3d.log('Simulated click on', `${element.tagName}#${element.id}.${element.className}`)
  }

  createCamera() {
    const camera = new ArcRotateCamera('camera', -1.24, 1.43, 30, new Vector3(0, 0, 0), this._scene)
    camera.attachControl(this._canvas, true)
    camera.minZ = 0.05
    camera.maxZ = 1000
    this._camera = camera
  }

  createLight(scene: Scene) {
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
    light.intensity = 0.7
  }

  private async _createSkyBox(): Promise<void> {
    return new Promise((resolve, reject) => {
      const skybox = MeshBuilder.CreateBox('skyBox', { size: 100.0 }, this._scene)
      const skyboxMaterial = new StandardMaterial('skyBox', this._scene)
      skyboxMaterial.backFaceCulling = false
      const files = [
        'textures/space_left.jpg',
        'textures/space_up.jpg',
        'textures/space_front.jpg',
        'textures/space_right.jpg',
        'textures/space_down.jpg',
        'textures/space_back.jpg'
      ]
      const reflectionTexture = CubeTexture.CreateFromImages(files, this._scene)
      // not working
      // const reflectionTexture = new CubeTexture('', this._scene, null, undefined, files, () => {

      reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE
      skyboxMaterial.reflectionTexture = reflectionTexture
      skyboxMaterial.disableLighting = true
      skyboxMaterial.diffuseColor = new Color3(0, 0, 0)
      skyboxMaterial.specularColor = new Color3(0, 0, 0)
      skybox.material = skyboxMaterial
      resolve()
      // })

      setTimeout(() => {
        reject()
      }, 60000)
    })
  }

  public async initScene() {
    this._scene.clearColor = new Color4(0, 0, 0, 0)
    this.createCamera()
    this.createLight(this._scene)

    await this._createDemo()
    await this.screenshot()
  }

  private async _createDemo() {
    await this._createSkyBox()
    this._createObjects()
  }

  private _createObjects() {
    const parent = new TransformNode('objects-parent', this._scene)
    parent.position.z = 10

    const boxMaterial = new StandardMaterial('boxMaterial', this._scene)
    boxMaterial.emissiveColor = Color3.Red().scale(0.4)
    boxMaterial.disableLighting = true

    const box = Mesh.CreateBox('box', 4, this._scene)
    box.parent = parent
    box.material = boxMaterial
    box.position.x = -8

    //

    const sphereMaterial = new StandardMaterial('sphereMaterial', this._scene)
    sphereMaterial.emissiveColor = Color3.Green().scale(0.4)
    sphereMaterial.disableLighting = true

    const sphere = Mesh.CreateSphere('box', 32, 4, this._scene)
    sphere.parent = parent
    sphere.material = sphereMaterial

    //

    const kokkiMaterial = new StandardMaterial('kokkiMaterial', this._scene)
    kokkiMaterial.emissiveColor = Color3.Blue().scale(0.4)
    kokkiMaterial.disableLighting = true

    const kokki = MeshBuilder.CreateCylinder('kokki', { diameterTop: 0, diameterBottom: 4, height: 4 }, this._scene)
    kokki.parent = parent
    kokki.material = kokkiMaterial
    kokki.position.x = 8
  }

  public async showDebugLayer() {
    await this._scene.debugLayer.show({
      embedMode: false,
      overlay: true
    })
  }

  public async hideDebugLayer() {
    await this._scene.debugLayer.hide()
  }

  public setTexture0(textureBuffer: Blob | ArrayBuffer | undefined) {
    if (textureBuffer) {
      const old = this._htmlTexture1
      old?.dispose()

      const texture = new Texture(
        'data:htmlTexture1',
        this._scene,
        true,
        true,
        Engine.TEXTURE_LINEAR_LINEAR,
        null,
        () => console.log('Error'),
        textureBuffer,
        false,
        Engine.TEXTUREFORMAT_RGBA
      )

      // this._htmlTexture1 = texture

      if (this._htmlMaterial1) {
        this._htmlMaterial1.emissiveTexture = texture
      }
    } else {
      console.log('TextureBuffer1 disconnected')
    }
  }

  public setTexture1(textureBuffer: ArrayBufferView | undefined) {
    if (textureBuffer) {
      if (!this._htmlTexture1) {
        const texture = new RawTexture(textureBuffer, PANEL_WIDTH, PANEL_HEIGHT, Engine.TEXTUREFORMAT_RGBA, this._scene, false, true)
        this._htmlTexture1 = texture
      } else {
        this._htmlTexture1.update(textureBuffer)
      }

      if (this._htmlMaterial1) {
        this._htmlMaterial1.emissiveTexture = this._htmlTexture1
      }
    } else {
      console.log('TextureBuffer1 disconnected')
    }
  }

  public setTexture2(textureBuffer: ArrayBufferView | undefined) {
    if (textureBuffer) {
      if (!this._htmlTexture2) {
        const texture = new RawTexture(textureBuffer, PANEL_WIDTH, PANEL_HEIGHT, Engine.TEXTUREFORMAT_RGBA, this._scene, false, true)
        this._htmlTexture2 = texture
      } else {
        this._htmlTexture2.update(textureBuffer)
      }

      if (this._htmlMaterial2) {
        this._htmlMaterial2.emissiveTexture = this._htmlTexture2
      }
    } else {
      console.log('TextureBuffer2 disconnected')
    }
  }

  async screenshot() {
    await this.showDebugLayer()

    const video = document.createElement('video')
    let captureStream: MediaStream | null = null
    const stopCapture = () => {
      if (!video.srcObject) {
        return
      }

      if (captureStream) {
        captureStream.getVideoTracks().forEach(v => {
          v.stop()
        })

        video.srcObject = null
      }
    }

    try {
      captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      video.srcObject = captureStream

      const scale = 1
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      const track = captureStream.getVideoTracks()[0]

      const imageCapture = new ImageCapture(track)

      const capture = async () => {
        const bitmap = await imageCapture.grabFrame()

        const w1 = PANEL_WIDTH
        const w2 = PANEL_WIDTH

        canvas.width = w1
        canvas.height = bitmap.height

        const w = canvas.width
        const h = canvas.height

        context?.drawImage(bitmap, 0, 0, w1, h, 0, 0, w1, h)
        const imgUrl1 = canvas.toDataURL()
        const imageData1 = context?.getImageData(0, 0, w, h)
        const buffer1 = imageData1?.data.buffer
        if (buffer1) {
          this.setTexture1(new Uint8Array(buffer1))
        }

        context?.drawImage(bitmap, bitmap.width - w2, 0, w2, h, 0, 0, w2, h)
        const imgUrl2 = canvas.toDataURL()
        const imageData2 = context?.getImageData(0, 0, w, h)
        const buffer2 = imageData2?.data.buffer
        if (buffer2) {
          this.setTexture2(new Uint8Array(buffer2))
        }

        window.requestAnimationFrame(capture)
      }

      window.requestAnimationFrame(capture)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  dataURItoBlob(dataURI: string) {
    let byteString: string
    if (dataURI.split(',')[0].indexOf('base64') >= 0) byteString = atob(dataURI.split(',')[1])
    else byteString = decodeURI(dataURI.split(',')[1])

    let mimeString = dataURI
      .split(',')[0]
      .split(':')[1]
      .split(';')[0]

    let blob = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      blob[i] = byteString.charCodeAt(i)
    }
    return new Blob([blob], {
      type: mimeString
    })
  }

  //   function simulate(element, eventName, options) {
  //     var opt = {
  //         pointerX: 0,
  //         pointerY: 0,
  //         button: 0,
  //         ctrlKey: false,
  //         altKey: false,
  //         shiftKey: false,
  //         metaKey: false,
  //         bubbles: true,
  //         cancelable: true
  //     }
  //     Object.assign(opt, options)

  //     var oEvent
  //     switch (eventName) {
  //         case "unload":
  //         case "abort":
  //         case "error":
  //         case "select":
  //         case "change":
  //         case "submit":
  //         case "reset":
  //         case "focus":
  //         case "blur":
  //         case "resize":
  //         case "scroll":
  //             oEvent = document.createEvent("HTMLEvents")
  //             oEvent.initEvent(eventName, opt.bubbles, opt.cancelable)
  //             break

  //         case "click":
  //         case "dblclick":
  //         case "mousedown":
  //         case "mouseup":
  //         case "mouseover":
  //         case "mousemove":
  //         case "mouseout":
  //         case "keydown":
  //         case "keyup":
  //             oEvent = document.createEvent("MouseEvents")
  //             oEvent.initMouseEvent(eventName, opt.bubbles, opt.cancelable, document.defaultView,
  //                 opt.button, opt.pointerX, opt.pointerY, opt.pointerX, opt.pointerY,
  //                 opt.ctrlKey, opt.altKey, opt.shiftKey, opt.metaKey, opt.button, element)
  //             break

  //         default:
  //             throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported')
  //     }

  //     element.dispatchEvent(oEvent)
  // }
}
