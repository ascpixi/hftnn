import React from "react";

export function bindIntValue(current: number, setter: (x: number) => void) {
    return {
        value: current.toString(),
        onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setter(ev.target.valueAsNumber)
    }
}

export function pick<T>(array: T[], step: number) {
    const o: T[] = [];
    for (let i = 0; i < array.length; i += step) {
        o.push(array[i]);
    }

    return o;
}