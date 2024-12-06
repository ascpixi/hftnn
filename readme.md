# Harmonic Fourier Transform for Neural Networks (HFTNN)
An HFTNN is a filtered version of a Fourier transform, suitable for training neural networks on content that is harmonic in nature. The resulting transforms may greatly reduce the required size of the input layer of a NN. For data such as e.g. piano performances or synthesizer pads, an HFTNN removes redundant information, as well as removing any inharmonic noise that might have been present in the dataset.

For example usage, you may refer to the [demo](./demo) contained in the repository. The demo is also hosted on [https://ascpixi.dev/hftnn](https://ascpixi.dev/hftnn).

## Theory of Operation
In an HFTNN forward transform, the following steps are performed:

1. Given a discrete signal $x[n]$, the signal is partitioned into non-overlapping, windowed segments of length $N$. Each segment is denoted as $x_{\text{chunk}}[k]$, where $k$ is the segment index.

   $$
   x_{\text{chunk}}[k] = x[n], \quad \text{for } n = kN \text{ to } (k+1)N - 1
   $$

2. The Fourier transform of each segment $x_{\text{chunk}}[k]$ is denoted as $X_{\text{chunk}}[k]$.

   $$
   X_{\text{chunk}}[k] = \mathcal{F}\left(x_{\text{chunk}}[k]\right)
   $$

3. For each Fourier transform bin, harmonics are selected within a specified range of octaves, including neighboring bins. Let $\text{HFT}$ be the resulting array.

   $$
   \text{HFT}[j] = \left[\text{magnitude}, \text{phase}\right]
   $$

   Here, $j$ represents the index iterating over the selected harmonics and neighboring bins.

4. The frequency corresponding to each harmonic is calculated using the function $\text{freq}(j)$. The corresponding FFT bin index is denoted as $\text{binIdx}(j)$.

   $$
   \text{freq}(j) = \text{intervalToFreq}\left(j, \text{fundamental}, \text{frequenciesInOctave}\right)
   $$

   $$
   \text{binIdx}(j) = \text{freqToFftBin}\left(\text{freq}(j), \text{sampleRate}, \text{signalLength}\right)
   $$

5. To handle edge cases where the computed bin index $\text{binIdx}$ and neighboring indices $\text{idx}$ may exceed array bounds, a conditional statement is used.

   $$
   \text{HFT}[j] = 
   \begin{cases} 
   [0, 0], & \text{if } \text{idx} < 0 \text{ or } \text{idx} \geq \text{bins.length} \\
   [\text{magnitude}, \text{phase}], & \text{otherwise}
   \end{cases}
   $$

A similar algorithm is employed for the inverse temporal transform.

## ✨ Usage
You can use the library as a regular `npm` package. For example usage, see [`/demo/src/app/HftnnDemo.tsx`](./demo/src/app/HftnnDemo.tsx).

```ts
import { hftnnForwardTemporal } from "hftnn";

const output = hftnnForwardTemporal(signal, {
   sampleRate: 44100,
   octaveRange: 11,
   extraBins: 2,
   interpolatedChunks: 0,
   dftSize: 2048,
   fundamental: 16.351597831287414,
   frequenciesInOctave: 12
});

// output is a [number, number][][] - i.e., an array of arrays of arrays that always hold two numbers
```

If you want to use the library out-right in a browser in vanilla JS, with all dependencies attached, use `npm run build`. This will create a `./build/hftnn-build.js` file, which you can then import in a browser.

```html
<script src="./build/hftnn-bundle.js"></script>

<script>
   console.log(HFTNN.hftnnForward(/* insert params here */));
</script>
```
