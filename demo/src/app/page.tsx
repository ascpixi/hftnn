"use client";

import { Button, Divider } from "@nextui-org/react";
import { RiCodeSSlashFill, RiGithubFill } from "@remixicon/react";

import { HftnnDemo } from "./HftnnDemo";

export default function Home() {
  return (
    <div className="px-48 py-32 font-[family-name:var(--font-sans)]">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-indigo-400">Harmonic Fourier Transform for Neural Networks</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-50">HFTNN</h1>
        </div>

        <div className="text-slate-400 flex flex-col gap-2">
          <p>
            HFTNN is a filtered version of a Fourier transform, suitable for training
            neural networks on content that is harmonic in nature. Examples of such
            content include synthesizer pads, piano performances, guitar recordings, etc.
          </p>

          <p>
            The HFTNN algorithm discards any spectral data that are not of concern for
            neural networks which are trained on such content. The bins of an HFTNN are
            constant, only varying by coefficients - which allows neural networks to better
            learn the relationships between different frequency partials, resulting in
            efficient training. Example uses of HFTNN include automatic synthesizer pad generation, creating new
            textures from samples the network has already seen.
          </p>

          <p className="font-bold">
            This website serves as a demonstration of the library. For detailed information,
            please check the GitHub repository.
          </p>
        </div>

        <div className="flex gap-2 w-full mt-4">
          <Button
            className="w-full"
            variant="bordered"
            startContent={<RiGithubFill/>}
            onClick={() => window.open("https://github.com/ascpixi/hftnn")}
          >GitHub</Button>

          <Button
            className="w-full"
            variant="bordered"
            startContent={<RiCodeSSlashFill/>}
            onClick={() => window.open("https://github.com/ascpixi/hftnn/tree/master/demo/src/app/HftnnDemo.tsx")}
          >Demo Source Code</Button>
        </div>
      </header>

      <Divider className="w-full my-8"/>

      <HftnnDemo/>

    </div>
  );
}
