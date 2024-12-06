import FFT from "fft.js"
import { CosineWindow, createComplexArray, fftBinToMagnitudePhase, freqToFftBin, isPowerOfTwo, lerp, magnitudePhaseToComplex } from "./math";
import { step } from "./util";

/**
 * Changes a frequency interval (semitone) to a frequency, so that if `x = intervalsInOctave`,
 * the returned value is a ratio of 2:1 in relation to `x`.
 * @param x The frequency interval, i.e. the amount of steps from the fundamental frequency. 
 * @param fundamental The fundamental frequency.
 * @param intervalsInOctave The amount of intervals in a single octave.
 */
function intervalToFreq(x: number, fundamental: number, intervalsInOctave: number) {
    return fundamental * Math.pow(2, x / intervalsInOctave);
}

/** Contains properties about a HFTNN. */
export interface HFTNNProperties {
    /** The sampling rate of the source signal, in hertz (Hz). */
    sampleRate: number;

    /** The lowest fundamental frequency of the signal. */
    fundamental: number;

    /** The number of frequencies in a single octave. */
    frequenciesInOctave: number;

    /**
     * The maximum range, in octaves, of the HFTNN. The higher this value is, the
     * more harmonic frequencies are preserved in the signal, and thus, the
     * higher the maximum frequency.
     */
    octaveRange: number;

    /**
     * The amount of additional Fourier transform bins to preserve around the
     * fundamental frequency bins. Higher values allow for detuned frequencies
     * to be contained in the resulting HFTNN, but increase the amount of
     * data required to represent the signal.
     */
    extraBins: number;

    /**
     * The amount of interpolated chunks between real HFTNN chunks. The higher
     * this value is, the less amount of chunks are required to represent a longer
     * signal, but will result in a less faithful signal recreation.
     */
    interpolatedChunks: number;

    /**
     * The size of the discrete Fourier transform of a sequence. This value has
     * to be a power of two and greater than 1. Higher values will result in less
     * data being stored at the expense of spectral "smearing".
     */
    dftSize: number;
}

/**
 * Calculates the forward HFTNN for the given signal.
 * @param signal The values of the signal to compute. Its length should be a power of two, and higher than 1.
 * @param properties The properties of the resulting HFTNN.
 * @param forwardWindow The signal window to use. If specified, the window is required to have the same length as `signal`.
 */
export function hftnnForward(
    signal: number[],
    properties: HFTNNProperties,
    forwardWindow?: CosineWindow
): [number, number][] {
    if(signal == undefined)
        throw new Error("No signal has been specified.");

    if(!isPowerOfTwo(signal.length))
        throw new Error("The given signals length must be a power of two and higher than 1.");

    if(properties == undefined)
        throw new Error("No properties have been given.")

    const f = new FFT(properties.dftSize);
    const transform = createComplexArray(properties.dftSize);

    if (forwardWindow != null && forwardWindow.length == signal.length) {
        forwardWindow.apply(signal);
    } else {
        new CosineWindow(signal.length).apply(signal);
    }

    f.realTransform(transform, signal);

    const bins = new Array<{ magnitude: number, phase: number } | undefined>(transform.length / 2);
    const hft: [number, number][] = [];

    function computeBinIfNecessary(idx: number) {
        if (bins[idx] == undefined) {
            let fftIdx = idx * 2;
            bins[idx] = fftBinToMagnitudePhase(transform[fftIdx], transform[fftIdx + 1]);
        }
    }

    let j = 0;
    for (let oct = 1; oct <= properties.octaveRange; oct++) {
        for (let i = 0; i < properties.frequenciesInOctave; i++) {
            const freq = intervalToFreq(j, properties.fundamental, properties.frequenciesInOctave);
            j++;

            let binIdx = freqToFftBin(freq, properties.sampleRate, signal.length);
            for (let extraBinIdx = -properties.extraBins; extraBinIdx < 0; extraBinIdx++) {
                let idx = binIdx + extraBinIdx;

                if(idx < 0) {
                    hft.push([0, 0]);
                } else {
                    computeBinIfNecessary(idx);
                    let bin = bins[idx];
                    hft.push([bin.magnitude, bin.phase]);
                }
            }

            computeBinIfNecessary(binIdx);
            const bin = bins[binIdx];
            hft.push([bin.magnitude, bin.phase]);

            for (let extraBinIdx = 1; extraBinIdx <= properties.extraBins; extraBinIdx++) {
                let idx = binIdx + extraBinIdx;

                if(idx >= bins.length) {
                    hft.push([0, 0]);
                } else {
                    computeBinIfNecessary(idx);
                    let bin = bins[idx];
                    hft.push([bin.magnitude, bin.phase]);
                }
            }
        }
    }

    return hft;
}

/**
 * Calculates a temporal forward HFTNN for the given signal.
 * @param signal The values of the signal to compute. Its length should be a power of two, and higher than 1.
 * @param properties The properties of the resulting HFTNN.
 */
export function hftnnForwardTemporal(
    signal: number[],
    properties: HFTNNProperties
): [number, number][][] {
    if(signal.length < properties.dftSize) {
        signal.length = properties.dftSize;
        return [hftnnForward(signal, properties)];
    }

    const forwardWindow = new CosineWindow(properties.dftSize);

    let j = 0;
    const hftnns: [number, number][][] = [];
    for (let i = 0; i < signal.length; i += (properties.dftSize / 2)) {
        if(j == 0 || i >= signal.length + (properties.dftSize / 2)) {
            const chunk = signal.slice(i, i + properties.dftSize); // !!!
            let chunkLen = chunk.length;
            chunk.length = properties.dftSize;
            chunk.fill(0, chunkLen); // fill the array with 0s if was originally less than 2048

            hftnns.push(hftnnForward(chunk, properties, forwardWindow));
        }

        j++;
        if (j > properties.interpolatedChunks) {
            j = 0;
        }
    }

    return hftnns;
}

/**
 * Calculates the signal for the given HFTNN.
 * @param hft The HFTNN to transform into a signal.
 * @param properties The properties of the input HFTNN.
 */
export function hftnnInverse(hft: [number, number][], properties: HFTNNProperties) {
    if(hft == undefined)
        throw new Error("No HFTNN has been specified.");

    if(properties == undefined)
        throw new Error("No properties have been given.")

    const f = new FFT(properties.dftSize);
    const bins = createComplexArray(properties.dftSize);

    let i = 0;
    let interval = 0;

    while(i < hft.length) {
        let baseFreq = intervalToFreq(interval, properties.fundamental, properties.frequenciesInOctave);
        let baseBin = freqToFftBin(baseFreq, properties.sampleRate, properties.dftSize);

        for (let j = properties.extraBins; j > 0; j--) {
            let extraBin = (baseBin - j) * 2;
            let complex = magnitudePhaseToComplex(hft[i][0], hft[i][1]);
            bins[extraBin] = complex[0];
            bins[extraBin + 1] = complex[1];
            i++;
        }

        let baseBinComplex = baseBin * 2;
        let complex = magnitudePhaseToComplex(hft[i][0], hft[i][1]);
        bins[baseBinComplex] = complex[0];
        bins[baseBinComplex + 1] = complex[1];
        i++;

        for (let j = 1; j <= properties.extraBins; j++) {
            let extraBin = (baseBin + j) * 2;
            let complex = magnitudePhaseToComplex(hft[i][0], hft[i][1]);
            bins[extraBin] = complex[0];
            bins[extraBin + 1] = complex[1];
            i++;
        }

        interval++;
    }

    const inverse = createComplexArray(properties.dftSize);
    f.inverseTransform(inverse, bins);
    return step(inverse, 1);
}

/**
 * Calculates the signal for the given temporal HFTNN.
 * @param hftt The temporal HFTNN to transform into a signal.
 * @param properties The properties of the input HFTNN.
 */
export function hftnnInverseTemporal(hftt: [number, number][][], properties: HFTNNProperties) {
    if (hftt.length == 0)
        return [];

    const signals: number[][] = [];
    let windowFunc: CosineWindow | undefined = undefined;

    for (let i = 0; i < hftt.length; i++) {
        const hft = hftt[i];
        let signal = hftnnInverse(hft, properties);

        if(windowFunc == undefined) {
            windowFunc = new CosineWindow(signal.length);
        }

        windowFunc.apply(signal);
        signals.push(signal); // TODO: maybe we should allocate space for all the signals beforehand
        
        if(properties.interpolatedChunks > 0 && (i + 1) < hftt.length) {
            const nextHft = hftt[i + 1];
            i++;

            for (let j = 0; j < properties.interpolatedChunks * 2; j++) {
                // add missing interpolated chunks
                let t = (j + 1) / ((properties.interpolatedChunks * 2) + 1);

                const interpolated = [];
                for (let k = 0; k < hft.length; k++) {
                    interpolated.push(
                        [
                            lerp(hft[k][0], nextHft[k][0], t),
                            lerp(hft[k][1], nextHft[k][1], t),
                        ]
                    );
                }

                signal = hftnnInverse(interpolated, properties);
                windowFunc.apply(signal);
                signals.push(signal);
            }

            // do an inverse transform on the lookahead HFT
            signal = hftnnInverse(nextHft, properties);
            windowFunc.apply(signal);
            signals.push(signal);
        }
    }

    // reconstruct signal by overlapping + sine windowing
    const signal = [...signals[0]];
    for (let i = 1; i < signals.length; i++) {
        let relativeStart = Math.floor((signal.length - (properties.dftSize * 2)) + ((properties.dftSize * 2) * (1 / 2)));

        for (let j = 0; j < (properties.dftSize * 2); j++) {
            let signalIdx = relativeStart + j;
            if(signal.length <= signalIdx) {
                signal.push(signals[i][j]);
            } else {
                signal[signalIdx] = (signal[signalIdx] + signals[i][j]) * 2;
            }
        }
    }

    return signal;
}