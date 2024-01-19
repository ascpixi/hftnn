
# Harmonic Fourier Transform for Neural Networks (HFTNN)

This repository contains an example of computing a HFTNN - a modified version of a discrete Fourier transform, suitable for training neural networks on content that is harmonic in nature.

The resulting transforms may greatly reduce the required size of the input layer of a NN. For data such as e.g. piano performances or synthesizer pads, a HFTNN of a given discrete signal removes redundant information, which includes any inharmonic noise that may be present in the dataset.

For example usage, you may refer to the [demo](./src/demo/index.html) contained in the repository.

## Theory of operation
For a temporal HFTNN forward transform, the following steps are done:
1. Given a discrete signal $x[n]$, the signal is split into non-overlapping, windowed chunks of length $N$. Each chunk is denoted as $x_{chunk}[k]$, where $k$ is the index of the chunk.

$$
\begin{align*}
x_{chunk}[k] = x[n], \quad \text{for } n = kN \text{ to } (k+1)N - 1
\end{align*}
$$
	
2. The Fourier transform of each chunk $x_{chunk}[k]$ is denoted as $X_{\text{chunk}}[k]$.

$$
\begin{align*}
X_{\text{chunk}}[k] = \mathcal{F}(x_{\text{chunk}}[k])
\end{align*}
$$
  
4. For each Fourier transform bin, harmonics are selected within a specified range of octaves, including neighboring bins. Let $HFT$ be the resulting array.

$$
\begin{align*}
HFT[j] = [\text{magnitude, phase}]
\end{align*}
$$

Here, $j$ represents the index iterating over the selected harmonics and neighboring bins.

5. The frequency corresponding to each harmonic is calculated using a function $\text{freq}(j)$. The corresponding FFT bin index is denoted as $\text{binIdx}(j)$.

$$
\begin{align*}
\text{freq}(j) = \text{intervalToFreq}(j, \text{fundamental}, \text{frequenciesInOctave})
\newline
\text{binIdx}(j) = \text{freqToFftBin}(\text{freq}(j), sampleRate, \text{signalLength})
\end{align*}
$$
  
6.  To handle edge cases where the computed bin index $binIdx$ and neighboring indices $idx$ may go beyond the bounds of the array, a conditional statement is used.

$$
\begin{align*}
HFT[j] = \begin{cases} [0, 0], & \text{if } \text{idx} < 0 \text{ or } \text{idx} \geq \text{bins.length} \newline [\text{magnitude, phase}], & \text{otherwise} \end{cases}
\end{align*}
$$

In summary, the abstraction involves the concept of signal chunking, Fourier transformation, harmonic selection, frequency calculation, and handling edge cases for each selected harmonic. The resulting $HFT$ array captures the magnitude and phase information for the selected harmonics and neighboring bins across all chunks.

A similar algorithm is used for the inverse temporal transform.

> [!NOTE]
> This document is currently a work in progress, and does not describe the full operation of the HFTNN algorithm.
