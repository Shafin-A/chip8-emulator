import InputHandler from "./input";

type Instruction = {
  type: string;
  X?: number;
  Y?: number;
  N?: number;
  NN?: number;
  NNN?: number;
};

class CPU {
  memory: Uint8Array;
  display: Uint8Array;
  pc: number; // program counter
  I: number; // index register
  stack: number[];
  delayTimer: number;
  soundTimer: number;
  V: Uint8Array; // variable registers V0-VF

  inputHandler: InputHandler;

  constructor() {
    this.memory = new Uint8Array(4096); // 4kb memory
    this.display = new Uint8Array(64 * 32); // 64x32 pixel display
    this.pc = 0x200; // starts at 0x200
    this.I = 0;
    this.stack = [];
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.V = new Uint8Array(16);
    this.inputHandler = new InputHandler();
  }

  reset() {
    this.memory.fill(0);
    this.display.fill(0);
    this.pc = 0x200;
    this.I = 0;
    this.stack = [];
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.V.fill(0);
  }

  loadSpritesIntoMemory() {
    const sprites = [
      0xf0,
      0x90,
      0x90,
      0x90,
      0xf0, // 0
      0x20,
      0x60,
      0x20,
      0x20,
      0x70, // 1
      0xf0,
      0x10,
      0xf0,
      0x80,
      0xf0, // 2
      0xf0,
      0x10,
      0xf0,
      0x10,
      0xf0, // 3
      0x90,
      0x90,
      0xf0,
      0x10,
      0x10, // 4
      0xf0,
      0x80,
      0xf0,
      0x10,
      0xf0, // 5
      0xf0,
      0x80,
      0xf0,
      0x90,
      0xf0, // 6
      0xf0,
      0x10,
      0x20,
      0x40,
      0x40, // 7
      0xf0,
      0x90,
      0xf0,
      0x90,
      0xf0, // 8
      0xf0,
      0x90,
      0xf0,
      0x10,
      0xf0, // 9
      0xf0,
      0x90,
      0xf0,
      0x90,
      0x90, // A
      0xe0,
      0x90,
      0xe0,
      0x90,
      0xe0, // B
      0xf0,
      0x80,
      0x80,
      0x80,
      0xf0, // C
      0xe0,
      0x90,
      0x90,
      0x90,
      0xe0, // D
      0xf0,
      0x80,
      0xf0,
      0x80,
      0xf0, // E
      0xf0,
      0x80,
      0xf0,
      0x80,
      0x80, // F
    ];

    for (let i = 0; i < sprites.length; i++) {
      this.memory[i] = sprites[i];
    }
  }

  loadRom(rom: Uint8Array) {
    this.reset();
    this.loadSpritesIntoMemory();
    for (let i = 0; i < rom.length; i++) {
      this.memory[0x200 + i] = rom[i];
    }
  }

  fetch(): number {
    // shift 8 bytes, adds 8 zeros: << 8
    // then bitwise OR to merge: |
    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc += 2;
    return opcode;
  }

  decode(opcode: number): Instruction {
    const instruction: Instruction = { type: "" };
    instruction.X = (opcode & 0x0f00) >> 8;
    instruction.Y = (opcode & 0x00f0) >> 4;
    instruction.N = opcode & 0x000f;
    instruction.NN = opcode & 0x00ff;
    instruction.NNN = opcode & 0x0fff;

    switch (opcode & 0xf000) {
      case 0x0000:
        switch (opcode & 0x00ff) {
          case 0x00e0: // 00E0: Clear the screen
            instruction.type = "00E0";
            break;

          case 0x00ee: // 00EE:	Return from a subroutine
            instruction.type = "00EE";
            break;

          default:
            throw new Error(`Unknown opcode ${opcode.toString(16)}`);
        }
        break;

      case 0x1000: // 1NNN:	Jump to address NNN
        instruction.type = "1NNN";
        break;

      case 0x2000: // 2NNN:	Execute subroutine starting at address NNN
        instruction.type = "2NNN";
        break;

      case 0x3000: // 3XNN:	Skip the following instruction if the value of register VX equals NN
        instruction.type = "3XNN";
        break;

      case 0x4000: // 4XNN:	Skip the following instruction if the value of register VX is not equal to NN
        instruction.type = "4XNN";
        break;

      case 0x5000: // 5XY0:	Skip the following instruction if the value of register VX is equal to the value of register VY
        instruction.type = "5XY0";
        break;

      case 0x6000: // 6XNN:	Store number NN in register VX
        instruction.type = "6XNN";
        break;

      case 0x7000: // 7XNN:	Add the value NN to register VX
        instruction.type = "7XNN";
        break;

      case 0x8000:
        switch (opcode & 0x000f) {
          case 0x0000: // 8XY0:	Store the value of register VY in register VX
            instruction.type = "8XY0";
            break;
          case 0x0001: // 8XY1:	Set VX to VX OR VY
            instruction.type = "8XY1";
            break;
          case 0x0002: // 8XY2:	Set VX to VX AND VY
            instruction.type = "8XY2";
            break;
          case 0x0003: // 8XY3:	Set VX to VX XOR VY
            instruction.type = "8XY3";
            break;

          // 8XY4:
          // Add the value of register VY to register VX
          // Set VF to 01 if a carry occurs
          // Set VF to 00 if a carry does not occur
          case 0x0004:
            instruction.type = "8XY4";
            break;

          // 8XY5:
          // Subtract the value of register VY from register VX
          // Set VF to 00 if a borrow occurs
          // Set VF to 01 if a borrow does not occur
          case 0x0005:
            instruction.type = "8XY5";
            break;

          // 8XY6:
          // Store the value of register VY (if toggled) shifted right one bit in register VX
          // Set register VF to the least significant bit prior to the shift
          // VY is unchanged
          case 0x0006:
            instruction.type = "8XY6";
            break;

          // 8XY7:
          // Set register VX to the value of VY minus VX
          // Set VF to 00 if a borrow occurs
          // Set VF to 01 if a borrow does not occur
          case 0x0007:
            instruction.type = "8XY7";
            break;

          // 8XYE:
          // Store the value of register VY (if toggled) shifted left one bit in register VX
          // Set register VF to the most significant bit prior to the shift
          // VY is unchanged
          case 0x000e:
            instruction.type = "8XYE";
            break;

          default:
            throw new Error(`Unknown opcode ${opcode.toString(16)}`);
        }
        break;

      case 0x9000: // 9XY0:	Skip the following instruction if the value of register VX is not equal to the value of register VY
        instruction.type = "9XY0";
        break;

      case 0xa000: // ANNN:	Store memory address NNN in register I
        instruction.type = "ANNN";
        break;

      case 0xb000: // BNNN:	Jump to address NNN + V0
        instruction.type = "BNNN";
        break;

      case 0xc000: // CXNN:	Set VX to a random number with a mask of NN
        instruction.type = "CXNN";
        break;

      // DXYN:
      case 0xd000:
        instruction.type = "DXYN";
        break;

      case 0xe000:
        switch (opcode & 0x00ff) {
          // EX9E:
          // Skip the following instruction if the key corresponding to the hex value currently stored in register VX is pressed
          case 0x009e:
            instruction.type = "EX9E";
            break;

          // EXA1
          // Skip the following instruction if the key corresponding to the hex value currently stored in register VX is not pressed
          case 0x00a1:
            instruction.type = "EXA1";
            break;

          default:
            throw new Error(`Unknown opcode ${opcode.toString(16)}`);
        }
        break;

      case 0xf000:
        switch (opcode & 0x00ff) {
          case 0x0007: // FX07: Store the current value of the delay timer in register VX
            instruction.type = "FX07";
            break;

          case 0x000a: // FX0A:	Wait for a keypress and store the result in register VX
            instruction.type = "FX0A";
            break;

          case 0x0015: // FX15:	Set the delay timer to the value of register VX
            instruction.type = "FX15";
            break;

          case 0x0018: // FX18:	Set the sound timer to the value of register VX
            instruction.type = "FX18";
            break;

          case 0x001e: // FX1E:	Add the value stored in register VX to register I
            instruction.type = "FX1E";
            break;

          // FX29:
          // Set I to the memory address of the sprite data corresponding to the hexadecimal digit stored in register VX
          case 0x0029:
            instruction.type = "FX29";
            break;

          // FX33:
          // Store the binary-coded decimal equivalent of the value stored in register VX at addresses I, I + 1, and I + 2
          case 0x0033:
            instruction.type = "FX33";
            break;

          // FX55:
          // Store the values of registers V0 to VX inclusive in memory starting at address I
          // I is set to I + X + 1 after operation
          case 0x0055:
            instruction.type = "FX55";
            break;

          // FX65:
          // Fill registers V0 to VX inclusive with the values stored in memory starting at address I
          // I is set to I + X + 1 after operation
          case 0x0065:
            instruction.type = "FX65";
            break;
        }
        break;

      default:
        throw new Error(`Unknown opcode ${opcode.toString(16)}`);
    }

    return instruction;
  }

  async execute(
    instruction: Instruction,
    shiftToggle: boolean,
    jumpToggle: boolean,
    iToggle: boolean
  ) {
    const X = instruction.X;
    const Y = instruction.Y;
    const N = instruction.N;
    const NN = instruction.NN;
    const NNN = instruction.NNN;

    switch (instruction.type) {
      case "00E0":
        this.display.fill(0);
        break;

      case "00EE":
        this.pc = this.stack.pop()!;
        break;

      case "1NNN":
        this.pc = NNN!;
        break;

      case "2NNN":
        this.stack.push(this.pc);
        this.pc = NNN!;
        break;

      case "3XNN":
        if (this.V[X!] === NN) this.pc += 2;
        break;

      case "4XNN":
        if (this.V[X!] !== NN) this.pc += 2;
        break;

      case "5XY0":
        if (this.V[X!] === this.V[Y!]) this.pc += 2;
        break;

      case "6XNN":
        this.V[X!] = NN!;
        break;

      case "7XNN":
        this.V[X!] += NN!;
        break;

      case "8XY0":
        this.V[X!] = this.V[Y!];
        break;

      case "8XY1":
        this.V[X!] |= this.V[Y!];
        break;

      case "8XY2":
        this.V[X!] &= this.V[Y!];
        break;

      case "8XY3":
        this.V[X!] ^= this.V[Y!];
        break;

      case "8XY4":
        const sumVXY = this.V[X!] + this.V[Y!];
        this.V[0xf] = sumVXY > 0xff ? 1 : 0; // carry
        this.V[X!] = sumVXY;
        break;

      case "8XY5":
        this.V[0xf] = this.V[X!] > this.V[Y!] ? 1 : 0; // borrow
        this.V[X!] = this.V[X!] - this.V[Y!];
        break;

      case "8XY6":
        if (shiftToggle) this.V[X!] = this.V[Y!];
        this.V[0xf] = this.V[X!] & 0x01; // least significant bit
        this.V[X!] >>= 1;
        break;

      case "8XY7":
        this.V[0xf] = this.V[Y!] > this.V[X!] ? 1 : 0; // borrow
        this.V[X!] = this.V[Y!] - this.V[X!];
        break;

      case "8XYE":
        if (shiftToggle) this.V[X!] = this.V[Y!];
        this.V[0xf] = this.V[X!] >> 7; // most significant bit
        this.V[X!] <<= 1;
        break;

      case "9XY0":
        if (this.V[X!] !== this.V[Y!]) this.pc += 2;
        break;

      case "ANNN":
        this.I = NNN!;
        break;

      case "BNNN":
        jumpToggle
          ? (this.pc = this.V[X!] + NNN!)
          : (this.pc = this.V[0] + NNN!);
        break;

      case "CXNN":
        this.V[X!] = Math.floor(Math.random() * 0xff) & NN!;
        break;

      case "DXYN":
        const x = this.V[X!];
        const y = this.V[Y!];
        const height = N!;
        this.V[0xf] = 0;

        for (let row = 0; row < height; row++) {
          const sprite = this.memory[this.I + row];
          for (let col = 0; col < 8; col++) {
            if ((sprite & (0x80 >> col)) !== 0) {
              const displayIndex = (x + col + (y + row) * 64) % (64 * 32);
              if (this.display[displayIndex] === 1) {
                this.V[0xf] = 1;
              }
              this.display[displayIndex] ^= 1;
            }
          }
        }

        break;

      case "EX9E":
        if (this.inputHandler.isKeyPressed(this.V[X!])) this.pc += 2;
        break;

      case "EXA1":
        if (!this.inputHandler.isKeyPressed(this.V[X!])) this.pc += 2;
        break;

      case "FX07":
        this.V[X!] = this.delayTimer;
        break;

      case "FX0A":
        const keyPress = await this.inputHandler.waitForKeyPress();

        if (!keyPress) {
          this.pc -= 2;
          return;
        }

        this.V[X!] = keyPress;
        break;

      case "FX15":
        this.delayTimer = this.V[X!];
        break;

      case "FX18":
        this.soundTimer = this.V[X!];
        break;

      case "FX1E":
        this.I += this.V[X!];
        break;

      case "FX29":
        this.I = this.V[X!] * 0x5;
        break;

      case "FX33":
        const VX = this.V[X!];
        this.memory[this.I!] = Math.floor(VX / 100);
        this.memory[this.I! + 1] = Math.floor((VX % 100) / 10);
        this.memory[this.I! + 2] = VX % 10;
        break;

      case "FX55":
        for (let i = 0; i <= X!; i++) {
          this.memory[this.I + i] = this.V[i];
        }
        if (iToggle) this.I = this.I + X! + 1;
        break;

      case "FX65":
        for (let i = 0; i <= X!; i++) {
          this.V[i] = this.memory[this.I + i];
        }
        if (iToggle) this.I = this.I + X! + 1;
        break;

      default:
        throw new Error(`Unknown instruction type ${instruction.type}`);
    }
  }

  updateTimers() {
    if (this.delayTimer > 0) this.delayTimer--;
    if (this.soundTimer > 0) this.soundTimer--;
  }

  emulateCycle(shiftToggle: boolean, jumpToggle: boolean, iToggle: boolean) {
    const opcode = this.fetch();
    const instruction = this.decode(opcode);
    this.execute(instruction, shiftToggle, jumpToggle, iToggle);
  }
}

export default CPU;
