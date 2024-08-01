import React, { useEffect, useRef, useState } from "react";
import Display from "./components/Display";
import CPU from "./emulator/cpu";
import beep from "./assets/8-bit.mp3";

import "./App.css";

const audio = new Audio(beep);

const App: React.FC = () => {
  const [cpu] = useState(() => new CPU());
  const [display, setDisplay] = useState<Uint8Array>(new Uint8Array(64 * 32));
  const [romLoaded, setRomLoaded] = useState(false);
  const [instructions, setInstructions] = useState(1);
  const [pausedInstructions, setPausedInstructions] = useState(instructions);
  const [isPaused, setIsPaused] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#ffffff");
  const [secondaryColor, setSecondaryColor] = useState("#000000");

  const [shiftToggle, setShiftToggle] = useState(true);
  const [jumpToggle, setJumpToggle] = useState(true);
  const [IToggle, setIToggle] = useState(true);

  const [volume, setVolume] = useState(0.1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRomFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rom = new Uint8Array(event.target!.result as ArrayBuffer);
      cpu.loadRom(rom);
      setRomLoaded(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadRomFromFile(file);
    }
  };

  const handlePauseEmulation = () => {
    setPausedInstructions(instructions);
    setInstructions(0);
    setIsPaused(true);
  };

  const handleUnPauseEmulation = () => {
    setInstructions(pausedInstructions);
    setIsPaused(false);
  };

  const handleStopEmulation = () => {
    cpu.reset();
    setDisplay(new Uint8Array(cpu.display));
    setRomLoaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    audio.volume = volume;
  }, [volume]);

  // Emulation loop
  useEffect(() => {
    if (!romLoaded) return;

    const frameRate = 60;
    const interval = 1000 / frameRate;

    const emulateCycle = () => {
      for (let i = 0; i < instructions; i++) {
        cpu.emulateCycle(shiftToggle, jumpToggle, IToggle);
      }
      setDisplay(new Uint8Array(cpu.display));
    };

    const updateTimers = () => {
      cpu.updateTimers();

      if (cpu.soundTimer > 0) audio.play();
    };

    const emulateCycleIntervalId = setInterval(emulateCycle, interval);
    const updateTimersIntervalId = setInterval(updateTimers, interval);

    // Cleanup on component unmount
    return () => {
      clearInterval(emulateCycleIntervalId);
      clearInterval(updateTimersIntervalId);
    };
  }, [cpu, romLoaded, instructions]);

  return (
    <div className="container">
      <h1>CHIP-8 Emulator</h1>

      <input
        type="file"
        accept=".ch8,.chip8"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="controls">
        <div>
          <label htmlFor="instructions">Instructions:</label>
          <input
            id="instructions"
            type="number"
            value={instructions}
            onChange={(e) => {
              setIsPaused(false);
              setInstructions(e.target.valueAsNumber);
            }}
            min="1"
          />
        </div>

        <div>
          <label htmlFor="volume">Volume:</label>
          <input
            id="volume"
            type="range"
            value={volume}
            onChange={(e) => setVolume(e.target.valueAsNumber)}
            min="0"
            max="1"
            step="0.01"
          />
        </div>
      </div>

      <div className="controls">
        <div>
          <label htmlFor="primary-color">Primary Color:</label>
          <input
            id="primary-color"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="secondary-color">Secondary Color:</label>
          <input
            id="secondary-color"
            type="color"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
          />
        </div>
      </div>

      <div className="controls">
        <div>
          <label htmlFor="shift">Shift Quirk:</label>
          <input
            id="shift"
            type="checkbox"
            defaultChecked={shiftToggle}
            onChange={() => setShiftToggle(!shiftToggle)}
          />
        </div>

        <div>
          <label htmlFor="jump">Jump Quirk:</label>
          <input
            id="jump"
            type="checkbox"
            defaultChecked={jumpToggle}
            onChange={() => setJumpToggle(!jumpToggle)}
          />
        </div>

        <div>
          <label htmlFor="I-quirk">I Quirk:</label>
          <input
            id="I-quirk"
            type="checkbox"
            defaultChecked={IToggle}
            onChange={() => setIToggle(!IToggle)}
          />
        </div>
      </div>

      <div className="display">
        <Display
          display={display}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </div>

      <div className="buttons">
        {isPaused ? (
          <button onClick={handleUnPauseEmulation}>PLAY</button>
        ) : (
          <button onClick={handlePauseEmulation}>PAUSE</button>
        )}
        <button onClick={handleStopEmulation}>STOP</button>
      </div>
    </div>
  );
};

export default App;
