import { Assets, Container, Filter, Graphics, Rectangle, RendererType, Sprite, Texture } from '../../vendor/pixi.esm.min.js';
import { H, W, mkText } from './ui.js';

// Bounds are measured from each 512px source cell at alpha >= 16. Registering
// the visible centre and planted foot avoids a jump when a pose changes.
const BOUNDS = {
    rear: [[160, 90, 362, 454], [160, 90, 358, 453], [157, 89, 354, 451],
        [160, 84, 357, 440], [154, 71, 350, 442], [161, 79, 351, 442]],
    oli: [[166, 80, 412, 476], [129, 75, 396, 476], [108, 85, 353, 476],
        [150, 51, 420, 423], [131, 47, 397, 423], [104, 69, 368, 422]],
    noel: [[86, 62, 413, 488], [75, 57, 398, 487], [60, 65, 390, 487],
        [85, 44, 415, 474], [75, 45, 398, 474], [64, 43, 404, 473]],
    miloKeys: [[140, 86, 370, 450], [144, 101, 366, 450], [148, 117, 363, 450],
        [155, 117, 355, 450], [159, 120, 352, 450], [159, 115, 351, 450]],
    miloBetween: [[138, 83, 372, 450], [140, 94, 371, 450], [141, 114, 370, 450],
        [150, 112, 360, 450], [154, 113, 357, 450], [154, 110, 357, 450]],
    miloWalk: [[159, 86, 407, 445], [133, 87, 387, 445], [144, 86, 393, 445],
        [163, 92, 409, 445], [135, 91, 388, 445], [156, 90, 397, 445]],
    side: [[158, 123, 351, 447], [169, 125, 347, 447],
        [167, 127, 351, 447], [172, 121, 342, 447]],
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, k) => a + (b - a) * clamp(k);
const fade = (t, start, duration) => clamp((t - start) / duration);
const pace = (t, start, end) => fade(t, start, end - start);
const ease = k => { const n = clamp(k); return n * n * (3 - 2 * n); };

// Coordinates are planted hooves in the 960x600 painted scenes. Each bend
// follows the visible dirt road, rather than cutting across the verge.
const TRAIL_ROAD = [
    [0, 480, 510, 200], [0.22, 480, 430, 186], [0.46, 514, 390, 168],
    [0.72, 620, 365, 149], [1, 690, 345, 136],
];
const BRIDGE_ROAD = [
    [0, 420, 618, 194], [0.20, 330, 580, 190], [0.42, 260, 525, 185],
    [0.65, 235, 460, 181], [0.85, 250, 420, 177], [1, 260, 400, 174],
];

// Measured within the twelve 512px Milo cells. The generated props shift the
// figure's bounding box, so align facial centre and planted hooves separately.
const MILO_FACE_X = [252, 252, 256, 255, 253, 252, 266, 241, 246, 246, 246, 242];
const MILO_FOOT_X = [252, 250, 254, 252, 252, 250, 264, 234, 235, 235, 235, 233];
const MILO_FACE_TARGET_X = 252;
const MILO_FACE_MASTER_X = 242;
const MILO_SCALE = 230 / 365;

function roadPoint(road, progress) {
    const k = clamp(progress);
    const next = road.findIndex(point => point[0] >= k);
    if (next <= 0) return road[0].slice(1);
    const a = road[next - 1], b = road[next];
    const part = (k - a[0]) / (b[0] - a[0]);
    return [mix(a[1], b[1], part), mix(a[2], b[2], part), mix(a[3], b[3], part)];
}

function sheetFrames(sheet, bounds, fixedScaleBasis = null) {
    return bounds.map(([left, top, right, foot], index) => ({
        texture: new Texture({
            source: sheet.source,
            frame: new Rectangle(index % 3 * 512, Math.floor(index / 3) * 512, 512, 512),
        }),
        anchorX: (left + right) / 1024,
        anchorY: foot / 512,
        scaleBasis: fixedScaleBasis ?? foot - top + 1,
    }));
}

function stillFrames(textures, bounds) {
    return textures.map((texture, index) => ({
        texture,
        anchorX: (bounds[index][0] + bounds[index][2]) / 1024,
        anchorY: bounds[index][3] / 512,
        scaleBasis: bounds[index][3] - bounds[index][1] + 1,
    }));
}

function actor(layer, frames) {
    const node = layer.addChild(new Sprite(frames[0].texture));
    node.eventMode = 'none';
    node._openingFrame = -1;
    return node;
}

function pose(node, frames, index, x, y, visibleHeight, alpha = 1, flipX = false) {
    const item = frames[index];
    if (node._openingFrame !== index) {
        node.texture = item.texture;
        node.anchor.set(item.anchorX, item.anchorY);
        node._openingFrame = index;
    }
    node.position.set(x, y);
    const scale = visibleHeight / item.scaleBasis;
    node.scale.set((flipX ? -1 : 1) * scale, scale);
    node.alpha = alpha;
    node.visible = alpha > 0;
}

function background(layer, texture) {
    const sprite = layer.addChild(new Sprite(texture));
    sprite.width = W;
    sprite.height = H;
    sprite.eventMode = 'none';
    return sprite;
}

const CAPTIONS = [
    [0, '奧利跟著星燈，尋找今晚的郵路。'],
    [3.1, '光指向石橋旁那條小路。'],
    [6.3, '奧利沿著光，走向橋頭的舊郵箱。'],
    [11.1, '咦？這是早就停用的舊榛樹郵箱！'],
    [14.8, '奧利：諾爾！信被送到停用的郵箱了！'],
    [17.7, '諾爾：燈都亮著……光怎麼偏了？'],
    [21.1, '米洛：先別急，我們一起看看發生了什麼。'],
    [24.2, '米洛：帶上筆記和放大鏡，從第一盞燈查起！'],
    [29.0, '米洛：準備好了。一起找出燈光偏移的原因！'],
];

// A top-to-bottom GPU reveal keeps one hat and one outfit at every pixel.
// The lit seam and small UV ripple turn each key pose into continuous motion.
const TRANSFORM_VERTEX = `#version 300 es
    in vec2 aPosition;
    out vec2 vTextureCoord;
    out vec2 vLocalCoord;
    uniform vec4 uInputSize;
    uniform vec4 uOutputFrame;
    uniform vec4 uOutputTexture;

    void main(void) {
        vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
        position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
        position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y)
            - uOutputTexture.z;
        gl_Position = vec4(position, 0.0, 1.0);
        vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
        vLocalCoord = aPosition;
    }
`;
const TRANSFORM_FRAGMENT = `#version 300 es
    in vec2 vTextureCoord;
    in vec2 vLocalCoord;
    out vec4 finalColor;
    uniform sampler2D uTexture;
    uniform sampler2D uFaceTexture;
    uniform float uProgress;
    uniform float uTime;
    uniform float uFront;
    uniform float uFaceCenterX;
    uniform float uFootShiftX;

    void main(void) {
        float progress = clamp(uProgress, 0.0, 1.0);
        float moving = sin(progress * 3.14159265);
        vec2 faceSpace = (vLocalCoord - vec2(uFaceCenterX / 512.0, 0.425))
            / vec2(0.095, 0.078);
        float faceLock = 1.0 - smoothstep(0.78, 1.0, length(faceSpace));
        float edge = mix(-0.06, 1.06, progress)
            + sin(vLocalCoord.x * 19.0 + uTime * 10.0) * 0.018 * moving;
        float seam = exp(-pow((vLocalCoord.y - edge) * 37.0, 2.0)) * moving;
        vec2 uv = vTextureCoord;
        uv.x += sin(uv.y * 22.0 - uTime * 9.0) * 0.007 * seam
            * (1.0 - faceLock);
        uv.x -= uFootShiftX / 512.0 * smoothstep(0.52, 0.85, vLocalCoord.y);
        vec4 color = texture(uTexture, clamp(uv, 0.0, 1.0));
        // Frame 5 in the 3x2 key sheet is the single facial identity master.
        // Keep its eyes, nose, smile and cheek outline pixel-stable while the
        // hat, clothing and props are allowed to change around it.
        vec2 faceUv = vec2((2.0 + vLocalCoord.x
            + (${MILO_FACE_MASTER_X.toFixed(1)} - uFaceCenterX) / 512.0) / 3.0,
            (1.0 + vLocalCoord.y) / 2.0);
        vec4 face = texture(uFaceTexture, faceUv);
        color = mix(color, face, faceLock * face.a);
        float newPart = 1.0 - smoothstep(edge - 0.018, edge + 0.018,
            vLocalCoord.y);
        float cover = mix(1.0 - newPart, newPart, uFront);
        vec3 starlight = mix(vec3(0.40, 0.87, 0.83), vec3(1.0, 0.83, 0.48),
            0.5 + 0.5 * sin(vLocalCoord.x * 18.0 + uTime * 6.0));
        color.rgb += starlight * color.a * seam * 0.55;
        finalColor = color * cover;
    }
`;

function transformFilter(front, faceSource) {
    return Filter.from({
        gl: { vertex: TRANSFORM_VERTEX, fragment: TRANSFORM_FRAGMENT },
        resources: {
            uFaceTexture: faceSource,
            uFaceSampler: faceSource.style,
            wipeUniforms: {
                uProgress: { value: 0, type: 'f32' },
                uTime: { value: 0, type: 'f32' },
                uFront: { value: front ? 1 : 0, type: 'f32' },
                uFaceCenterX: { value: MILO_FACE_TARGET_X, type: 'f32' },
                uFootShiftX: { value: 0, type: 'f32' },
            },
        },
    });
}

/**
 * Play only on a new starlight case, after gate validation and progress read.
 * Returns true when the case brief should open. All art is loaded before motion
 * begins so scene changes never wait on a request in the middle of playback.
 */
export function playStarlightOpening({ app, root, container, sceneAccess, opening, scenes }) {
    const layer = root.addChild(new Container());
    layer.eventMode = 'static';
    layer.hitArea = new Rectangle(0, 0, W, H);
    const loading = layer.addChild(new Graphics().rect(0, 0, W, H).fill(0x130f25));
    loading.eventMode = 'none';
    const label = mkText('星燈小徑的故事即將開始…', 22, 0xf5e2ba, { weight: '700' });
    label.anchor.set(0.5);
    label.position.set(W / 2, H / 2);
    layer.addChild(label);

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'detective-opening-skip';
    skip.textContent = '略過動畫，查看案件介紹';
    container.append(skip);
    const oldAccessHidden = sceneAccess?.hidden;
    if (sceneAccess) sceneAccess.hidden = true;
    const live = container.querySelector('#detectiveStatus');
    let ended = false;
    let tick = null;
    const transformFilters = [];
    let resolveDone;
    const done = new Promise(resolve => { resolveDone = resolve; });

    const finish = showBrief => {
        if (ended) return;
        ended = true;
        if (tick) app.ticker.remove(tick);
        skip.removeEventListener('click', onSkip);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('pagehide', onPageHide);
        skip.remove();
        if (sceneAccess) sceneAccess.hidden = oldAccessHidden;
        if (layer.parent) layer.parent.removeChild(layer);
        layer.destroy({ children: true });
        transformFilters.forEach(filter => filter.destroy());
        if (live && showBrief) live.textContent = '動畫結束。閱讀案件介紹後開始調查。';
        resolveDone(showBrief);
    };
    const onSkip = () => finish(true);
    const onKey = event => {
        if (event.key === 'Escape') { event.preventDefault(); finish(true); }
    };
    const onPageHide = () => finish(false);
    skip.addEventListener('click', onSkip);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pagehide', onPageHide, { once: true });
    skip.focus({ preventScroll: true });

    const imageUrls = [
        scenes.trail.bg, scenes.bridge.bg, scenes.hut.bg,
        opening.rear, opening.oli, opening.noel,
        opening.miloKeys, opening.miloBetween, opening.miloWalk,
        ...opening.oliSide,
    ];
    void Promise.all(imageUrls.map(url => Assets.load(url))).then(textures => {
        if (ended) return;
        layer.removeChildren().forEach(child => child.destroy());
        const [trailArt, bridgeArt, hutArt, rearArt, oliArt, noelArt,
            miloKeysArt, miloBetweenArt, miloWalkArt, ...sideArt] = textures;
        const trail = background(layer, trailArt);
        const bridge = background(layer, bridgeArt);
        const hut = background(layer, hutArt);
        const rear = sheetFrames(rearArt, BOUNDS.rear);
        const oli = sheetFrames(oliArt, BOUNDS.oli);
        const noel = sheetFrames(noelArt, BOUNDS.noel);
        // The first hat is physically taller. Keep one scale across all twelve
        // drawings so Milo's face and body never inflate as the hat changes.
        const keys = sheetFrames(miloKeysArt, BOUNDS.miloKeys, 365);
        const between = sheetFrames(miloBetweenArt, BOUNDS.miloBetween, 365);
        const milo = keys.flatMap((frame, index) => [frame, between[index]]);
        const miloWalk = sheetFrames(miloWalkArt, BOUNDS.miloWalk, 365);
        const side = stillFrames(sideArt, BOUNDS.side);
        const oliLook = actor(layer, oli);
        const oliTrail = actor(layer, rear);
        const oliBridge = actor(layer, rear);
        const oliMail = actor(layer, oli);
        const oliHurry = actor(layer, side);
        const oliHut = actor(layer, oli);
        const noelHut = actor(layer, noel);
        const miloEntering = actor(layer, miloWalk);
        const magicBack = layer.addChild(new Graphics());
        magicBack.eventMode = 'none';
        const miloHut = actor(layer, milo);
        const miloReveal = actor(layer, milo);
        let shaderWipe = app.renderer.type === RendererType.WEBGL;
        if (shaderWipe) {
            try {
                const oldFilter = transformFilter(false, miloKeysArt.source);
                transformFilters.push(oldFilter);
                const newFilter = transformFilter(true, miloKeysArt.source);
                transformFilters.push(newFilter);
                miloHut.filters = [oldFilter];
                miloReveal.filters = [newFilter];
            } catch (error) {
                transformFilters.forEach(filter => filter.destroy());
                transformFilters.length = 0;
                shaderWipe = false;
                console.warn('[偵探事件簿] 變裝 shader 無法啟用，沿用逐幀演出：', error);
            }
        }
        const magicFront = layer.addChild(new Graphics());
        magicFront.eventMode = 'none';
        const subtitleBack = layer.addChild(new Graphics()
            .roundRect(70, 15, 680, 58, 18)
            .fill({ color: 0x21172d, alpha: 0.9 })
            .stroke({ color: 0xf6d883, width: 2 }));
        subtitleBack.eventMode = 'none';
        const subtitle = mkText('', 19, 0xffebbd, { weight: '700' });
        subtitle.anchor.set(0.5);
        subtitle.position.set(410, 44);
        layer.addChild(subtitle);
        const curtain = layer.addChild(new Graphics().rect(0, 0, W, H).fill(0x160d22));
        curtain.eventMode = 'none';

        let seconds = 0;
        let lastCaption = -1;
        tick = ticker => {
            if (!container.isConnected) { finish(false); return; }
            seconds += Math.min(ticker.deltaMS, 50) / 1000;
            const t = seconds;
            bridge.alpha = fade(t, 5.65, 0.5);
            hut.alpha = fade(t, 14.2, 0.65);
            trail.visible = t < 6.2;
            bridge.visible = t < 14.9;
            hut.visible = t >= 14.2;
            curtain.alpha = t < 0.4 ? 1 - fade(t, 0, 0.4)
                : t >= 31.1 ? fade(t, 31.1, 0.7) : 0;
            let captionIndex = 0;
            for (let i = 1; i < CAPTIONS.length; i++) {
                if (t >= CAPTIONS[i][0]) captionIndex = i;
            }
            if (captionIndex !== lastCaption) {
                subtitle.text = CAPTIONS[captionIndex][1];
                if (live) live.textContent = CAPTIONS[captionIndex][1];
                lastCaption = captionIndex;
            }
            subtitleBack.alpha = subtitle.alpha = t >= 31.1 ? 1 - fade(t, 31.1, 0.5) : 1;

            // Trail: searching in place, then a rear three-quarter walk into the lit path.
            const lookFrame = t < 0.75 ? 0 : t < 1.45 ? 1 : t < 2.25 ? 0 : t < 3.1 ? 2 : 0;
            pose(oliLook, oli, lookFrame, 478, 516, 200, 1 - fade(t, 3.2, 0.25));
            if (t < 3.2) oliLook.visible = true;
            const roadK = pace(t, 3.2, 6.0);
            const [trailX, trailY, trailHeight] = roadPoint(TRAIL_ROAD, roadK);
            const trailFrame = roadK < 0.35
                ? Math.max(0, Math.floor((t - 3.2) / 0.22)) % 4
                : 4 + (Math.floor((t - 3.2) / 0.22) & 1);
            pose(oliTrail, rear, trailFrame, trailX, trailY, trailHeight,
                fade(t, 3.2, 0.2) * (1 - fade(t, 5.5, 0.45)));
            if (t < 3.2) oliTrail.visible = false;

            // Bridge: the same road enters at lower-right, then curves toward
            // the old mailbox. Mirror the rear three-quarter frames to face left.
            const bridgeK = pace(t, 6.1, 10.85);
            const [bridgeX, bridgeY, bridgeHeight] = roadPoint(BRIDGE_ROAD, bridgeK);
            pose(oliBridge, rear, 4 + (Math.floor((t - 6.1) / 0.25) & 1),
                bridgeX, bridgeY, bridgeHeight,
                fade(t, 6.1, 0.35) * (1 - fade(t, 10.8, 0.4)), true);
            if (t < 6.1) oliBridge.visible = false;
            const mailFrame = t < 11.65 ? 3 : t < 12.3 ? 4 : t < 13.5 ? 3 : 5;
            pose(oliMail, oli, mailFrame, 266, 409, 174,
                fade(t, 10.85, 0.35) * (1 - fade(t, 14.2, 0.4)));
            if (t < 10.85) oliMail.visible = false;

            // Keeper hut: Oli runs left to Noel; Noel listens, then hesitates.
            const hutIn = fade(t, 14.2, 0.65);
            const hurryK = pace(t, 14.45, 17.25);
            pose(oliHurry, side, Math.max(0, Math.floor((t - 14.45) / 0.16)) % 4,
                mix(990, 486, hurryK), mix(525, 535, hurryK), 200,
                hutIn * (1 - fade(t, 17.25, 0.3)));
            if (t < 14.45) oliHurry.visible = false;
            pose(oliHut, oli, t < 18.5 ? 5 : 4, 494, 537, 200, fade(t, 17.2, 0.3));
            if (t < 17.2) oliHut.visible = false;
            const noelFrame = t < 17.2 ? 0 : t < 18.1 ? 1 : t < 19 ? 2
                : t < 20 ? 3 : t < 21.2 ? 4 : 5;
            pose(noelHut, noel, noelFrame, 233, 542, 198, hutIn);
            if (t < 14.2) noelHut.visible = false;

            // Adjacent costumes are revealed along a moving GPU light seam.
            // A single image occupies each pixel; the previous hat is gone
            // before the next cap appears at the top of the figure.
            const miloIn = ease(pace(t, 20.5, 23.2));
            const miloX = mix(1030, 766, miloIn);
            const miloTurn = fade(t, 23.05, 0.42);
            const miloAlpha = miloTurn;
            pose(miloEntering, miloWalk,
                Math.max(0, Math.floor((t - 20.5) / 0.18)) % 6,
                miloX, 545, 230,
                fade(t, 20.5, 0.35) * (1 - miloTurn));
            if (t < 20.5) miloEntering.visible = false;
            const phase = Math.min(milo.length - 1,
                Math.max(0, (t - 23.5) / 0.34));
            const transforming = t >= 23.5 && phase < milo.length - 1;
            const fromFrame = Math.min(milo.length - 2, Math.floor(phase));
            const toFrame = fromFrame + 1;
            const betweenFrames = phase - fromFrame;
            if (shaderWipe) {
                const [oldFilter, newFilter] = transformFilters;
                oldFilter.enabled = true;
                newFilter.enabled = transforming;
                const uniformsOld = oldFilter.resources.wipeUniforms.uniforms;
                const uniformsNew = newFilter.resources.wipeUniforms.uniforms;
                uniformsOld.uProgress = transforming ? betweenFrames : 0;
                uniformsNew.uProgress = betweenFrames;
                uniformsOld.uTime = uniformsNew.uTime = t - 23.5;
                const oldFrame = transforming ? fromFrame : t < 23.5 ? 0 : milo.length - 1;
                const oldOffset = MILO_FACE_TARGET_X - MILO_FACE_X[oldFrame];
                const newOffset = MILO_FACE_TARGET_X - MILO_FACE_X[toFrame];
                uniformsOld.uFaceCenterX = MILO_FACE_X[oldFrame];
                uniformsNew.uFaceCenterX = MILO_FACE_X[toFrame];
                uniformsOld.uFootShiftX = MILO_FACE_TARGET_X
                    - MILO_FOOT_X[oldFrame] - oldOffset;
                uniformsNew.uFootShiftX = MILO_FACE_TARGET_X
                    - MILO_FOOT_X[toFrame] - newOffset;
                pose(miloHut, milo, oldFrame,
                    miloX + oldOffset * MILO_SCALE, 545, 230, miloAlpha);
                pose(miloReveal, milo, toFrame,
                    miloX + newOffset * MILO_SCALE, 545, 230,
                    transforming ? miloAlpha : 0);
            } else {
                // Pixi's other renderers retain the same readable key poses.
                const frame = Math.floor(phase);
                const offset = MILO_FACE_TARGET_X - MILO_FACE_X[frame];
                pose(miloHut, milo, frame,
                    miloX + offset * MILO_SCALE, 545, 230, miloAlpha);
                miloReveal.visible = false;
            }
            if (t < 20.5) miloHut.visible = miloReveal.visible = false;

            const magic = fade(t, 23.5, 0.5) * (1 - fade(t, 27.4, 0.8));
            magicBack.clear();
            magicFront.clear();
            magicBack.position.set(miloX, 545);
            magicFront.position.set(miloX, 545);
            if (magic > 0) {
                const wave = Math.sin((t - 23.5) * 5);
                magicBack.ellipse(0, -98, 108 + wave * 5, 31)
                    .stroke({ color: 0x5ddad1, width: 3, alpha: 0.48 * magic });
                magicBack.ellipse(0, -116, 119 - wave * 4, 42)
                    .stroke({ color: 0xf9d575, width: 2, alpha: 0.55 * magic });
                magicBack.circle(0, -123, 121 + wave * 2)
                    .stroke({ color: 0x98e7de, width: 1.5, alpha: 0.24 * magic });
                for (let i = 0; i < 18; i++) {
                    const angle = i * 2.39996 + (t - 23.5) * 0.65;
                    const radius = 76 + (i % 4) * 18;
                    const x = Math.cos(angle) * radius;
                    const y = -132 + Math.sin(angle) * 86 - ((t - 23.5) * (12 + i % 5) % 38);
                    const twinkle = 0.55 + 0.45 * Math.sin(t * 7 + i * 1.7);
                    magicFront.star(x, y, 4, 2.5 + (i % 3) * 1.5, 1.1)
                        .fill({ color: i % 3 ? 0xfbe3a0 : 0x8ae7da,
                            alpha: magic * twinkle * 0.85 });
                }
            }
            if (t >= 31.8) finish(true);
        };
        app.ticker.add(tick);
    }).catch(error => {
        console.warn('[偵探事件簿] 開場動畫素材載入失敗，改顯示案件介紹：', error);
        finish(true);
    });
    return done;
}
