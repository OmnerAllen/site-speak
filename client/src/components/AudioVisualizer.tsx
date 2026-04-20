import { useEffect, useRef } from "react";

export function AudioVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volHistory = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 1024;
    source.connect(analyserNode);

    const buf = new Uint8Array(analyserNode.frequencyBinCount);
    
    const HISTORY_S = 6;
    const SAMPLE_RATE = 30;
    const MAX_BARS = HISTORY_S * SAMPLE_RATE;
    const volHist = volHistory.current;
    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext("2d");

    function drawViz() {
      if (!ctx2d || !canvas) return;
      const W = canvas.offsetWidth * devicePixelRatio;
      const H = canvas.offsetHeight * devicePixelRatio;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      ctx2d.clearRect(0, 0, W, H);
      const barW = W / MAX_BARS;
      for (let i = 0; i < volHist.length; i++) {
        const v = volHist[i];
        ctx2d.fillStyle = `hsl(${120 - v * 120},80%,45%)`;
        ctx2d.fillRect(i * barW, H - v * H, Math.max(1, barW - 1), v * H);
      }
    }

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      analyserNode.getByteFrequencyData(buf);
      const rms =
        Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length) / 255;
      volHist.push(rms);
      if (volHist.length > MAX_BARS) volHist.shift();
      drawViz();
    }
    
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtx.close();
      volHistory.current = [];
      if (ctx2d && canvas) {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height); // clear on unmount
      }
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-12 bg-gray-900 border border-gray-700 rounded-lg mb-3 ${stream ? "block" : "hidden"}`}
    />
  );
}
