// A static centered interval tree for fast "what is active at time t" queries.
//
// The timeline asks, every playback frame, which clips are active at the
// playhead. A linear filter is O(n) per frame; this answers stabbing queries in
// O(log n + k). Intervals are half-open [start, end): contains(t) ⇔ start ≤ t < end.
// The tree is rebuilt when clips change (rare) and queried per frame (hot).

export interface Interval {
	start: number;
	end: number;
}

interface Node<T extends Interval> {
	center: number;
	/** Items overlapping center, sorted by start ascending. */
	byStart: T[];
	/** Same items, sorted by end descending. */
	byEnd: T[];
	left?: Node<T>;
	right?: Node<T>;
}

function build<T extends Interval>(items: T[]): Node<T> | undefined {
	if (items.length === 0) return undefined;

	// Center on the median endpoint so the tree stays roughly balanced.
	const pts: number[] = [];
	for (const it of items) pts.push(it.start, it.end);
	pts.sort((a, b) => a - b);
	const center = pts[pts.length >> 1];

	const left: T[] = [];
	const right: T[] = [];
	let here: T[] = [];
	for (const it of items) {
		if (it.end <= center) left.push(it);
		else if (it.start > center) right.push(it);
		else here.push(it); // start <= center < end
	}
	// Degenerate guard: ensure progress so recursion always terminates.
	if (here.length === 0) {
		here = items;
		return {
			center,
			byStart: here.slice().sort((a, b) => a.start - b.start),
			byEnd: here.slice().sort((a, b) => b.end - a.end)
		};
	}

	return {
		center,
		byStart: here.slice().sort((a, b) => a.start - b.start),
		byEnd: here.slice().sort((a, b) => b.end - a.end),
		left: build(left),
		right: build(right)
	};
}

function stab<T extends Interval>(node: Node<T> | undefined, t: number, out: T[]): void {
	if (!node) return;
	if (t < node.center) {
		// All here-items have end > center > t, so start ≤ t ⇒ contains t.
		for (const it of node.byStart) {
			if (it.start <= t) out.push(it);
			else break;
		}
		stab(node.left, t, out);
	} else if (t > node.center) {
		// All here-items have start ≤ center < t, so end > t ⇒ contains t.
		for (const it of node.byEnd) {
			if (it.end > t) out.push(it);
			else break;
		}
		stab(node.right, t, out);
	} else {
		// t === center: every here-item contains it; neighbors cannot.
		for (const it of node.byStart) out.push(it);
	}
}

export class IntervalIndex<T extends Interval> {
	private root: Node<T> | undefined;

	constructor(items: T[]) {
		this.root = build(items.slice());
	}

	/** Items whose [start, end) contains t (unordered). */
	query(t: number): T[] {
		const out: T[] = [];
		stab(this.root, t, out);
		return out;
	}
}
