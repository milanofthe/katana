// Web Worker: downsample decoded audio channels to absolute-peak buckets.
// Runs off the main thread so importing long files never janks the UI.

interface PeaksRequest {
	channels: Float32Array[];
	resolution: number;
	maxSamplesPerBucket: number;
}

function computePeaks(req: PeaksRequest): Float32Array {
	const { channels, resolution, maxSamplesPerBucket } = req;
	const peaks = new Float32Array(resolution);
	const len = channels[0]?.length ?? 0;
	if (len === 0) return peaks;
	const bucket = Math.max(1, Math.floor(len / resolution));
	const stride = Math.max(1, Math.floor(bucket / maxSamplesPerBucket));
	for (const data of channels) {
		for (let i = 0; i < resolution; i++) {
			const start = i * bucket;
			const end = Math.min(len, start + bucket);
			let peak = 0;
			for (let j = start; j < end; j += stride) {
				const a = Math.abs(data[j]);
				if (a > peak) peak = a;
			}
			if (peak > peaks[i]) peaks[i] = peak;
		}
	}
	return peaks;
}

self.onmessage = (e: MessageEvent<PeaksRequest>) => {
	const peaks = computePeaks(e.data);
	// Transfer the result buffer back (zero-copy).
	(self as unknown as Worker).postMessage(peaks, [peaks.buffer]);
};
