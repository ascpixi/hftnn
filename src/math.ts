
/**
 * Converts the given magnitude phase to a complex number, represented by an array that contains both the real and
 * imaginary parts; in other words, this function converts coordinates in a polar form to coordinates in a rectangular form.
 * The returned number can be placed in a frequency bin in order to perform an IFFT.
 * @param magnitude The magnitude, or the length of the vector.
 * @param phase The phase, in radians.
 * @returns An array representing the calculated complex number, in the form of `[real, imaginary]`.
 */
export function magnitudePhaseToComplex(magnitude: number, phase: number): [number, number] {
    return [Math.cos(phase) * magnitude, Math.sin(phase) * magnitude];
}

/**
 * Determines whether the given integer is higher than 1 and a power of two.
 */
export function isPowerOfTwo(v: number) {
    return v > 1 && !(v & (v - 1));
}

/**
 * Linearly interpolates between two values.
 */
export function lerp(v0: number, v1: number, t: number) {
    return (1 - t) * v0 + t * v1;
}

/**
 * Calculates the magnitude and phase of the given FFT frequency bin, represented by a complex number.
 * In other words, this function converts coordinates in a rectangular form to coordinates in a polar form.
 * @param re The real component of the complex number.
 * @param im The imaginary component of the complex number.
 */
export function fftBinToMagnitudePhase(re: number, im: number) {
    let magnitude = Math.sqrt((re * re) + (im * im));
    let phase = Math.atan2(im, re);
    return { magnitude: magnitude, phase: phase };
}

/**
 * Gets the closest FFT frequency bin to the specified frequency in hertz (Hz).
 * @param freq The frequency to calculate the closest frequency bin to.
 * @param sampleRate The sampling rate of the signal to calculate the frequency bin for.
 * @param signalLength The length, in samples, of the signal to calculate the frequency for.
 * @returns The nearest FFT frequency bin.
 */
export function freqToFftBin(freq: number, sampleRate: number, signalLength: number ) {
    return Math.round((freq * signalLength) / sampleRate);
}

/**
 * Represents a pre-computed signal window, which is able to transform a signal
 * of up to `length` samples.
 */
export class CosineWindow {
    multipliers: number[];
    length: number;

    constructor(length: number) {
        const w = new Array<number>(length);
        let N = length - 1;

        for (let i = 0; i < length; i++) {
            w[i] = Math.sin(Math.PI * i / N);
        }

        this.multipliers = w;
        this.length = length;
    }

    /**
     * Applies this window to the target signal.
     */
    apply(signal: number[]) {
        for (let i = 0; i < Math.min(signal.length, this.length); i++) {
            signal[i] *= this.multipliers[i];
        }
    }
}

/**
 * Creates an array of complex numbers, where the real and imaginary components are interleaved in the array.
 * The format of the returned array looks as follows: `[real, imaginary, real, imaginary, ...]`
 * @param size The amount of complex numbers the array should store.
 */
export function createComplexArray(size: number) {
    const array = new Array<number>(size * 2);
    array.fill(0);
    return array;
}