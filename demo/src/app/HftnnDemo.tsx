import { useRef, useState } from "react";
import { Button, Divider, Input } from "@nextui-org/react";
import { WaveFile } from "wavefile";

import NextUiContainer from "./components/NextUiContainer";
import { bindIntValue, pick } from "./util";

import {
  hftnnForwardTemporal,
  hftnnInverseTemporal,
  HFTNNProperties
} from "../../../src/hftnn";

export function HftnnDemo() {
  const [extraBins, setExtraBins] = useState(2);
  const [octaveRange, setOctaveRange] = useState(11);
  const [numInterpChunks, setNumInterpChunks] = useState(0);
  const [dftSize, setDftSize] = useState(2048);

  const inputFile = useRef<HTMLInputElement>(null);

  const [hftnnArr, setHfttnArr] = useState<{
    signalLength: number,
    totalSize: number,
    singleSize: number,
    dataUrl: string
  }[]>([]);

  function readAudioInputBytes() {
    const reader = new FileReader();
  
    return new Promise<string | ArrayBuffer | null>((res, rej) => {
      reader.onload = () => res(reader.result);
      reader.onerror = () => rej(reader.error);

      reader.readAsArrayBuffer(inputFile.current!.files![0]);
    });
  }

  async function makeHftnn() {
    if (!inputFile.current!.files?.length) {
      alert("No file selected.");
      return;
    }

    const bytes = await readAudioInputBytes();
    if (!(bytes instanceof ArrayBuffer)) {
      console.error('"bytes" was of an invalid type! Expected an ArrayBuffer, but got a ', bytes);
      throw new Error("Unexpected 'readAudioInputBytes' return type");
    }

    const audioCtx = new AudioContext();
    const audioSampleRate = audioCtx.sampleRate;

    const audio = await audioCtx.decodeAudioData(bytes);
    const signal = Array.from(audio.getChannelData(0));

    // The properties of the HFTNN.
    const hftProperties = {
      sampleRate: audioSampleRate,
      octaveRange: octaveRange,
      extraBins: extraBins,
      interpolatedChunks: numInterpChunks,
      dftSize: dftSize,

      // These properties are constant, as we assume a western musical scale.
      // See https://ptolemy.berkeley.edu/eecs20/week8/scale.html for more information.
      // This can easily be modified to account for e.g. a pentatonic scale.
      fundamental: 16.351597831287414, // Be sure to specify this value with as much accuracy as possible!
      frequenciesInOctave: 12,
    } satisfies HFTNNProperties;

    console.log("-".repeat(30));
    let start, stop;
    let hftTransform, inverseHft;

    try {
        start = Date.now();
        hftTransform = hftnnForwardTemporal(signal, hftProperties);
        stop = Date.now();
    } catch (err) {
        alert("An error has occured while processing the forward transform!");
        throw err;
    }
    
    console.log(`HFT computed in ≈ ${stop - start}ms.`, hftTransform);

    try {
        start = Date.now();
        inverseHft = hftnnInverseTemporal(hftTransform, hftProperties);
        stop = Date.now();
    } catch (err) {
        alert("An error has occured while processing the inverse transform! Check the console for more details.");
        throw err;
    }

    console.log(`Inverse HFT computed in ≈ ${stop - start}ms.`);

    // Create a WAV file from the inversed HFT in order to visualize what data
    // was lost.
    const wav = new WaveFile();
    wav.fromScratch(
      1,                   // mono - one channel
      audioSampleRate,
      '32f',               // 32-bit float
      pick(inverseHft, 2)  // ignore the imaginary part of each complex number in the inverse HFT
    );

    const blob = new Blob([wav.toBuffer()], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    setHfttnArr([
      ...hftnnArr,
      {
        signalLength: signal.length,
        singleSize: hftTransform[0].length,
        totalSize: hftTransform.length * hftTransform[0].length * 2,
        dataUrl: url
      }
    ]);
  }

  return (
    <main className="flex flex-col w-full gap-4">
      <section className="flex flex-col gap-2">
        <div className="font-bold">Input audio file</div>

        <NextUiContainer>
          <input ref={inputFile}
            type="file"
            accept="audio/*"
            className={`
                    block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4 file:rounded-md 
                    file:border-2 file:border-foreground-400 file:border-solid
                    file:text-sm
                    file:bg-transparent file:text-slate-500 hover:file:bg-pink-100
                `}
          />
        </NextUiContainer>
      </section>

      <Divider className="w-full my-8"/>

      <section className="flex flex-col gap-4">
        <h1 className="font-bold">Parameters</h1>

        <Input
          type="number" label="Amount of extra bins" variant="bordered"
          {...bindIntValue(extraBins, setExtraBins)}
        />

        <Input
          type="number" label="Octave range" variant="bordered"
          {...bindIntValue(octaveRange, setOctaveRange)}
        />

        <Input
          type="number" label="Interpolated chunks" variant="bordered"
          {...bindIntValue(numInterpChunks, setNumInterpChunks)}
        />

        <Input
          type="number" label="DFT size" variant="bordered"
          {...bindIntValue(dftSize, setDftSize)}
        />

        <Button color="primary" variant="bordered" onClick={makeHftnn}>Transform to an HFTNN</Button>
      </section>
      
      <Divider className="w-full my-8"/>

      <section className="flex flex-col gap-4">
        <h1 className="font-bold">Generated HFTNNs</h1>
      
        {
          hftnnArr.length != 0 ? <></> :
          <div className="text-slate-700">None yet. Go generate some!</div>
        }

        { hftnnArr.map(x => (
          <div className="ml-4 rounded-lg border-2 p-4 border-slate-600" key={x.dataUrl}>
            <div><span className="font-bold">Total size: </span> {x.totalSize} values</div>
            <div><span className="font-bold">Source signal size: </span> {x.signalLength} values</div>
            <div><span className="font-bold">Single frame size (as complex numbers): </span> {x.singleSize} values</div>
            <div><span className="font-bold">Single frame size (seperated by r and θ): </span> {x.singleSize * 2} values</div>

            <div>Raw data difference: {((x.totalSize / x.signalLength) * 100).toFixed(2)}%</div>

            <audio className="mt-4" src={x.dataUrl} controls/>
          </div>
        )) }
      </section>
    
    </main>
  );
}