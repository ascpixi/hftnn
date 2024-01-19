"use strict";

(() => {
    /**
     * Calculates the magnitude and phase of the given FFT frequency bin, represented by a complex number.
     * In other words, this function converts coordinates in a rectangular form to coordinates in a polar form.
     * @param {number} re The real component of the complex number.
     * @param {number} im The imaginary component of the complex number.
     * @returns 
     */
    const fftBinToMagnitudePhase = (re, im) => {
        let magnitude = Math.sqrt((re * re) + (im * im));
        let phase = Math.atan2(im, re);
        return { magnitude: magnitude, phase: phase };
    }

    /**
     * Converts the given magnitude phase to a complex number, represented by an array that contains both the real and
     * imaginary parts; in other words, this function converts coordinates in a polar form to coordinates in a rectangular form.
     * The returned number can be placed in a frequency bin in order to perform an IFFT.
     * @param {number} magnitude The magnitude, or the length of the vector.
     * @param {number} phase The phase, in radians.
     * @returns An array representing the calculated complex number, in the form of `[real, imaginary]`.
     */
    const magnitudePhaseToComplex = (magnitude, phase) => {
        return [Math.cos(phase) * magnitude, Math.sin(phase) * magnitude];
    }

    /**
     * Determines whether the given integral value is higher than 1 and a power of two.
     * @param {number} v Any integral value.
     */
    const isPowerOfTwo = (v) => {
        return v > 1 && !(v & (v - 1));
    }

    /**
     * Linearly interpolates between two values.
     * @param {number} v0 
     * @param {number} v1 
     * @param {number} t 
     * @returns 
     */
    const lerp = (v0, v1, t) => {
        return (1 - t) * v0 + t * v1;
    }

    /**
     * Gets the closest FFT frequency bin to the specified frequency in hertz (Hz).
     * @param {number} freq The frequency to calculate the closest frequency bin to.
     * @param {number} sampleRate The sampling rate of the signal to calculate the frequency bin for.
     * @param {number} signalLength The length, in samples, of the signal to calculate the frequency for.
     * @returns {number} The calculated nearest FFT frequency bin.
     */
    const freqToFftBin = (freq, sampleRate, signalLength) => {
        return Math.round((freq * signalLength) / sampleRate);
    }

    class CosineWindow {
        /**
         * @param {number} length 
         */
        constructor(length) {
            const w = new Array(length);
            let N = length - 1;

            for (let i = 0; i < length; i++) {
                w[i] = Math.sin(Math.PI * i / N);
            }

            this.multipliers = w;
            this.length = length;
        }

        /**
         * Applies this window to the target signal.
         * @param {number[]} signal 
         */
        apply(signal){
            for (let i = 0; i < Math.min(signal.length, this.length); i++) {
                signal[i] *= this.multipliers[i];
            }
        }
    }

    /**
     * Changes a frequency interval (semitone) to a frequency, so that if `x = intervalsInOctave`,
     * the returned value is a ratio of 2:1 in relation to `x`.
     * @param {number} x The frequency interval, i.e. the amount of steps from the fundamental frequency. 
     * @param {number} fundamental The fundamental frequency.
     * @param {number} intervalsInOctave The amount of intervals in a single octave.
     * @returns 
     */
    const intervalToFreq = (x, fundamental, intervalsInOctave) => {
        return fundamental * Math.pow(2, x / intervalsInOctave);
    }

    /**
     * 
     * @param {any[]} array 
     * @param {number} step 
     */
    const step = (array, step) => {
        const output = new Array(array.length / step);

        let j = 0;
        for (let i = 0; i < array.length; i += step) {
            output[j] = array[i];
            j++;
        }

        return output;
    }

    /**
     * Attempts to create a FFT wrapper over a imported library.
     * @returns {FFTWrapper | null}
     */
    const createAutoFftWrapper = () => {
        if(globalThis["FFTJS"] != undefined) {
            return {
                construct: (fftSize) => new FFTJS(fftSize),
                realTransform: (obj, out, inp) => obj.realTransform(out, inp),
                inverseTransform: (obj, out, inp) => obj.inverseTransform(out, inp)
            }
        } else {
            return null;
        }
    }

    /**
     * Contains properties about a HFTNN.
     * @typedef {Object} HFTNNProperties
     * 
     * @property {number} sampleRate
     * The sampling rate of the source signal, in hertz (Hz).
     * 
     * @property {number} fundamental
     * The lowest fundamental frequency of the signal.
     * 
     * @property {number} frequenciesInOctave
     * The number of frequencies in a single octave.
     * 
     * @property {number} octaveRange
     * The maximum range, in octaves, of the HFTNN. The higher this value is, the more harmonic frequencies are
     * preserved in the signal, and thus, the higher the maximum frequency.
     * 
     * @property {number} extraBins
     * The amount of additional Fourier transform bins to preserve around the fundamental frequency bins. Higher
     * values allow for detuned frequencies to be contained in the resulting HFTNN, but increase the amount of
     * data required to represent the signal.
     * 
     * @property {number} interpolatedChunks
     * The amount of interpolated chunks between real HFTNN chunks. The higher this value is, the less amount of
     * chunks are required to represent a longer signal, but will result in a less faithful signal recreation.
     * 
     * @property {number} dftSize
     * The size of the discrete Fourier transform of a sequence. This value has to be a power of two and greater
     * than 1. Higher values will result in less data being stored at the expense of spectral "smearing". 
     */

    /**
     * Represents a collection of methods that can be used to calculate an FFT.
     * @typedef {Object} FFTWrapper
     * 
     * @property {(fftSize: number) => Object} construct
     * A function used to construct an FFT object of a given size.
     * 
     * @property {(obj: any, output: number[], input: number[]) => void} realTransform
     * A function used to compute the FFT for the given sequence of real values. The output should be in the format of
     * interleaved real and imaginary components; i.e. `[real, imaginary, real, imaginary, ...]`.
     * 
     * @property {(obj: any, output: number[], input: number[]) => void} inverseTransform
     * A function used to compute the inverse FFT (IFFT) for the given FFT output, represented by an array of complex numbers,
     * the components of which are interleaved throughout the array. The output array is also a complex array; however, the imaginary
     * part is ignored, meaning it can be either computed or left equal to zero.
     */
    
    /** @type { CosineWindow | null } */
    let forwardWindow = null;

    /** @type { FFTWrapper } */
    let fftWrapper;

    const ensureFftWrapperExists = () => {
        if(fftWrapper == null) {
            fftWrapper = createAutoFftWrapper();

            if(fftWrapper == null) {
                throw new Error("No FFT wrapper has been registered, and no compatible FFT library has been detected to create one automatically. Use HFTNN.bindFftLibrary to bind a FFT wrapper.");
            }
        }
    }

    /**
     * Creates an array of complex numbers, where the real and imaginary components are interleaved in the array.
     * The format of the returned array looks as follows: `[real, imaginary, real, imaginary, ...]`
     * @param {number} size The amount of complex numbers the array should store.
     * @returns {number[]}
     */
    const createComplexArray = (size) => {
        const array = new Array(size * 2);
        array.fill(0);
        return array;
    }

    class HFTNN {
        /**
         * Instructs HFTNN.js to use the given methods to calculate FFTs.
         * @param {FFTWrapper} wrapper The wrapper to use.
         */
        static bindFftLibrary(wrapper){
            fftWrapper = wrapper;
        }

        /**
         * Calculates the forward HFTNN for the given signal.
         * @param {number[]} signal The values of the signal to compute. Should be a power of two, and higher than 1.
         * @param {HFTNNProperties} properties The properties of the resulting HFTNN.
         */
        static forward(signal, properties) {
            ensureFftWrapperExists();

            if(signal == undefined)
                throw new Error("No signal has been specified.");

            if(!isPowerOfTwo(signal.length))
                throw new Error("The given signals length must be a power of two and higher than 1.");

            if(properties == undefined)
                throw new Error("No properties have been given.")

            const f = fftWrapper.construct(properties.dftSize);
            const transform = createComplexArray(properties.dftSize);

            if(forwardWindow != null) {
                forwardWindow.apply(signal);
            } else {
                new CosineWindow(signal.length).apply(signal);
            }

            fftWrapper.realTransform(f, transform, signal);

            /** @type {{ magnitude: number, phase: number }[]} */
            const bins = new Array(transform.length / 2);
            
            /** @type { number[][] } */
            const hft = [];

            /**
             * @param {number} idx 
             */
            const computeBinIfNecessary = (idx) => {
                if(bins[idx] == undefined) {
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
         * @param {number[]} signal The values of the signal to compute. Should be a power of two, and higher than 1.
         * @param {HFTNNProperties} properties The properties of the resulting HFTNN.
         */
        static forwardTemporal(signal, properties) {
            if(signal.length < properties.dftSize) {
                signal.length = properties.dftSize;
                return [HFTNN.forward(signal, properties)];
            }

            forwardWindow = new CosineWindow(properties.dftSize);

            let j = 0;
            const hftnns = [];
            for (let i = 0; i < signal.length; i += (properties.dftSize / 2)) {
                if(j == 0 || i >= signal.length + (properties.dftSize / 2)) {
                    const chunk = signal.slice(i, i + properties.dftSize); // !!!
                    let chunkLen = chunk.length;
                    chunk.length = properties.dftSize;
                    chunk.fill(0, chunkLen); // fill the array with 0s if was originally less than 2048

                    hftnns.push(HFTNN.forward(chunk, properties));
                }

                j++;
                if(j > properties.interpolatedChunks) {
                    j = 0;
                }
            }

            forwardWindow = null;
            return hftnns;
        }

        /**
         * Calculates the signal for the given temporal HFTNN.
         * @param {number[][][]} hftt The temporal HFTNN to transform into a signal.
         * @param {HFTNNProperties} properties The properties of the input HFTNN.
         */
        static inverseTemporal(hftt, properties) {
            if(hftt.length == 0) {
                return [];
            }

            const signals = [];
            let windowFunc;

            for (let i = 0; i < hftt.length; i++) {
                const hft = hftt[i];
                let signal = HFTNN.inverse(hft, properties);

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

                        signal = HFTNN.inverse(interpolated, properties);
                        windowFunc.apply(signal);
                        signals.push(signal);
                    }

                    // do an inverse transform on the lookahead HFT
                    signal = HFTNN.inverse(nextHft, properties);
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
        
        /**
         * Calculates the signal for the given HFTNN.
         * @param {number[][]} hft The HFTNN to transform into a signal.
         * @param {HFTNNProperties} properties The properties of the input HFTNN.
         */
        static inverse(hft, properties) {
            ensureFftWrapperExists();

            if(hft == undefined)
                throw new Error("No HFTNN has been specified.");

            if(properties == undefined)
                throw new Error("No properties have been given.")

            const f = fftWrapper.construct(properties.dftSize);
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
            fftWrapper.inverseTransform(f, inverse, bins);
            return step(inverse, 1);
        }
    }

    if("module" in window) {
        // file used as a common.js module
        module.exports = HFTNN;
    } else {
        // file used as a browser import
        globalThis.HFTNN = HFTNN;
    }
})();