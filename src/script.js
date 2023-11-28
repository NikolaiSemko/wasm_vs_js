let N = 5;
let IsWasm = false;
let first = true;
let simpleMode = false;
const importObject = {
    module: {},
    env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
    }
};
WebAssembly.instantiateStreaming(fetch("./pkg/wasm_vs_js_bg.wasm"), importObject
).then(results => {
    let mod = results.instance;
    importObject.module.alloc = mod.exports.alloc;
    importObject.module.dealloc = mod.exports.dealloc;
    importObject.module.fill = mod.exports.fill;

    class Animation {
        constructor() {
            this.cnv = null;
            this.ctx = null;
            this.bmp = null;
            this.size = {w: 0, h: 0, cx: 0, cy: 0};
            this.perf = 0;
            this.total = 0;
            this.j = 100000;
            this.sin = [25600];
            this.k = [N * 2];
            this.XP = [N];
            this.YP = [N];
            this.bmp = null;
            this.byteSize = 0;
            this.pointer = null;
            this.img = null;
            this.timedelta = 0;
            this.cur_n = 5;
            this.wasm_box = null;
            this.simple_box = null;

        }

        init() {                    //point of entry
            this.createCanvas();
            this.updateAnimation();
        }

        createCanvas() {
            this.cnv = document.createElement("canvas");
            this.ctx = this.cnv.getContext('2d', {willReadFrequently: true});
            for (let i = 0; i < 25600; i++)
                this.sin[i] = Math.round(128 + 127 * Math.sin(i / (2560 / N))); //create an array to speed up the work
            for (let i = 0; i < N * 2; i++)
                this.k[i] = 20 + Math.round(Math.random() * 40000) % 200;
            this.setCanvasSize();
            this.ctx.font = "30px Verdana";
            this.ctx.fillStyle = "#FFFFFF80";
            this.ctx.textAlign = "center";
            document.body.appendChild(this.cnv);
            this.cur_n = document.querySelector("#current_n");
            this.wasm_box = document.querySelector("#wasm");
            this.simple_box = document.querySelector("#simple");
            IsWasm = this.wasm_box.checked;
            simpleMode = this.simple_box.checked;
            this.cur_n.value = N;

            this.cur_n.addEventListener('change', () => {
                first = true;
                N = parseInt(this.cur_n.value);
                this.XP.length = N;
                this.YP.length = N;
                this.perf = 0;
                this.total = 0;
                this.k.length = N * 2;
                for (let i = 0; i < 25600; i++)
                    this.sin[i] = Math.round(128 + 127 * Math.sin(i / (2560 / N))); //create an array to speed up the work
                for (let i = 0; i < N * 2; i++)
                    this.k[i] = 20 + Math.round(Math.random() * 40000) % 200;
                this.saveArrToBmp();
            });
            this.wasm_box.addEventListener('change', () => {
                IsWasm = this.wasm_box.checked;
                this.perf = 0;
                this.total = 0;
                first = true;
            });
            this.simple_box.addEventListener('change', () => {
                simpleMode = this.simple_box.checked;
                this.perf = 0;
                this.total = 0;
                first = true;
            });

            window.addEventListener(`resize`, () => this.setCanvasSize());

        }

        saveArrToBmp() {
            let y = this.size.w * 4 * this.size.h;
            for (let i = 0; i < 25600; i++)
                this.bmp[y + i] = this.sin[i];
            y += 25600;
            for (let i = 0; i < N * 2; i++)
                this.bmp[i + y] = this.k[i];
        }

        setCanvasSize() {
            this.size.w = this.cnv.width = window.innerWidth;
            this.size.h = this.cnv.height = window.innerHeight;
            let deltaH = Math.ceil(25800 / (this.size.w * 4));

            this.byteSize = this.size.w * this.size.h * 4 + deltaH * this.size.w * 4;
            this.pointer = importObject.module.alloc(this.byteSize);
            this.bmp = new Uint8ClampedArray(mod.exports.memory.buffer, this.pointer, this.byteSize);
            this.img = new ImageData(this.bmp, this.size.w, this.size.h + deltaH);

            this.saveArrToBmp();

            this.size.cx = this.size.w / 2;
            this.size.cy = this.size.h / 2;
            this.ctx.font = "30px Verdana";
            this.ctx.fillStyle = "#FFFFFF80";
            this.ctx.textAlign = "center";
        }

        updateCanvas() {
            let W = this.size.w;
            let H = this.size.h;
            this.timedelta = performance.now();
            this.j++;
            if (!IsWasm) {
                if (first) {
                    for (let w = 0; w < N; w++) {
                        this.XP[w] = W / 2 - (Math.sin(this.j / this.k[2 * w]) * W / 2);
                        this.YP[w] = H / 2 - (Math.cos(this.j / this.k[2 * w + 1]) * H / 2);
                    }

                    let pos = 0;

                    for (let Y = 0; Y < H; Y++) {
                        for (let X = 0; X < W; X++) {
                            let arr = [];
                            for (let i = 0; i < N; i++)
                                arr[i] = Math.sqrt((this.XP[i] - X) * (this.XP[i] - X) + (this.YP[i] - Y) * (this.YP[i] - Y));
                            let S1 = 0, S2 = 0;
                            let mid = Math.ceil(N / 2);
                            for (let i = 0; i < N; i++) {
                                if (i < mid) S1 += arr[i];
                                S2 += arr[i];
                            }
                            let d = S1 / S2;
                            pos = 4 * (Y * W + X);
                            this.bmp[pos + 3] = 255;
                            this.bmp[pos + 2] = this.sin[(d * 6400) | 0];
                            this.bmp[pos + 1] = this.sin[(d * 17920) | 0];
                            this.bmp[pos] = this.sin[(d * 11520) | 0];

                        }
                    }
                    this.timedelta = performance.now() - this.timedelta;
                    if (simpleMode) first = false;
                } else {
                    for (let Y = 0; Y < H; Y++) {
                        for (let X = 0; X < W; X++) {
                            let pos = 4 * (Y * W + X);
                            if (this.bmp[pos + 2] === 255) this.bmp[pos + 3] = this.bmp[pos + 3]&0xFB;
                            if (this.bmp[pos + 2] === 0) this.bmp[pos + 3] = this.bmp[pos + 3]|0x04;
                            if ((this.bmp[pos + 3]&0x04)>0) this.bmp[pos + 2] += 1;
                            else this.bmp[pos + 2] -= 1;
                            if (this.bmp[pos + 1] === 255) this.bmp[pos + 3] = this.bmp[pos + 3]&0xFD;
                            if (this.bmp[pos + 1] === 0) this.bmp[pos + 3] = this.bmp[pos + 3]|0x02;
                            if ((this.bmp[pos + 3]&0x02)>0) this.bmp[pos + 1] += 1;
                            else this.bmp[pos + 1] -= 1;
                            if (this.bmp[pos] === 255) this.bmp[pos + 3] = this.bmp[pos + 3]&0xFE;
                            if (this.bmp[pos] === 0) this.bmp[pos + 3] = this.bmp[pos + 3]|0x01;
                            if ((this.bmp[pos + 3]&0x01)>0) this.bmp[pos] += 1;
                            else this.bmp[pos] -= 1;
                        }
                    }
                    this.timedelta = performance.now() - this.timedelta;
                }
            } else {
                this.timedelta = performance.now();
                importObject.module.fill(this.pointer, this.size.w, this.size.h, N, this.j, simpleMode);
                //module.fill(this.pointer, this.size.w, this.size.h, this.total);
                this.timedelta = performance.now() - this.timedelta;
            }
            //this.ss+=0.01;
            //if (this.ss>20) this.ss=1.0;
            this.ctx.putImageData(this.img, 0, 0);
        }

        updateAnimation() {
            //let time = performance.now();
            this.updateCanvas();

            window.requestAnimationFrame(() => this.updateAnimation());
            this.perf += this.timedelta;
            this.total++;
            this.ctx.fillStyle = "#FFFFFF80";
            let running = (IsWasm)?'WebAssembly':'JavaScript';
            this.ctx.fillText(running+' is running now', this.size.cx, this.size.cy-40);
            this.ctx.fillText('Framing time = ' + (this.perf / this.total).toFixed(2) + ' milliseconds', this.size.cx, this.size.cy);
            this.ctx.fillStyle = "#00000080";
            this.ctx.fillText('Framing time = ' + (this.perf / this.total).toFixed(2) + ' milliseconds', this.size.cx, this.size.cy+40);
        }
    }

    window.onload = () => {
        new Animation().init();
    }
});
