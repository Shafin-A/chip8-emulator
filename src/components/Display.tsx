import React, { useEffect, useRef } from "react";

type DisplayProps = {
  display: Uint8Array;
  primaryColor: string;
  secondaryColor: string;
};

const Display: React.FC<DisplayProps> = ({
  display,
  primaryColor,
  secondaryColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = 64;
  const height = 32;
  const pixelSize = 10;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas?.getContext("2d");

    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIndex = x + y * width;
          const isOn = display[pixelIndex] === 1;
          context.fillStyle = isOn ? primaryColor : secondaryColor;
          context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }, [display]);

  return (
    <canvas
      ref={canvasRef}
      width={width * pixelSize}
      height={height * pixelSize}
    />
  );
};

export default Display;
