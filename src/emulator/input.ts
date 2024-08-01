const keyMap: { [key: string]: number } = {
  "1": 0x1,
  "2": 0x2,
  "3": 0x3,
  "4": 0xc,
  q: 0x4,
  w: 0x5,
  e: 0x6,
  r: 0xd,
  a: 0x7,
  s: 0x8,
  d: 0x9,
  f: 0xe,
  z: 0xa,
  x: 0x0,
  c: 0xb,
  v: 0xf,
};

class InputHandler {
  private keys: Uint8Array;

  constructor() {
    this.keys = new Uint8Array(16);
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
  }

  private onKeyDown(event: KeyboardEvent): void {
    const chip8Key = keyMap[event.key];
    if (chip8Key !== undefined) {
      this.keys[chip8Key] = 1;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const chip8Key = keyMap[event.key];
    if (chip8Key !== undefined) {
      this.keys[chip8Key] = 0;
    }
  }

  public getPressedKeys(): number[] {
    const pressedKeys: number[] = [];
    this.keys.forEach((value, index) => {
      if (value === 1) {
        pressedKeys.push(index);
      }
    });
    return pressedKeys;
  }

  public isKeyPressed(key: number): boolean {
    return this.keys[key] === 1;
  }

  public waitForKeyPress(): Promise<number> {
    return new Promise((resolve) => {
      const handleKeyPress = (event: KeyboardEvent) => {
        const chip8Key = keyMap[event.key];
        if (chip8Key !== undefined) {
          window.removeEventListener("keydown", handleKeyPress);
          resolve(chip8Key);
        }
      };
      window.addEventListener("keydown", handleKeyPress);
    });
  }
}

export default InputHandler;
