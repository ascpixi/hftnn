/**
 * Returns a copy of `array`, selecting every `step`-th element.
 */
export function step<T>(array: T[], step: number) {
    if (step == 1)
        return [...array];

    const output = new Array<T>(array.length / step);

    let j = 0;
    for (let i = 0; i < array.length; i += step) {
        output[j] = array[i];
        j++;
    }

    return output;
}