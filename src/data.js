'use strict';

import {quantile, extent} from 'd3-array';

export function whiskers(boxplot) {
	const iqr = boxplot.q3 - boxplot.q1;
	// since top left is max
	const whiskerMin = Math.max(boxplot.min, boxplot.q1 - iqr);
	const whiskerMax = Math.min(boxplot.max, boxplot.q3 + iqr);
	return {whiskerMin, whiskerMax};
}

export function boxplotStats(arr) {
	console.assert(Array.isArray(arr));
	if (arr.length === 0) {
		return {
			min: NaN,
			max: NaN,
			median: NaN,
			q1: NaN,
			q3: NaN,
			whiskerMin: NaN,
			whiskerMax: NaN,
			outliers: []
		};
	}
	arr = arr.filter((v) => typeof v === 'number' && !isNaN(v));
	arr.sort((a, b) => a - b);

	const minmax = extent(arr);
	const base = {
		min: minmax[0],
		max: minmax[1],
		median: quantile(arr, 0.5),
		q1: quantile(arr, 0.25),
		q3: quantile(arr, 0.75),
		outliers: []
	};
	const {whiskerMin, whiskerMax} = whiskers(base);
	base.outliers = arr.filter((v) => v < whiskerMin || v > whiskerMax);
	base.whiskerMin = whiskerMin;
	base.whiskerMax = whiskerMax;
	return base;
}

export function asBoxPlotStats(value) {
	if (typeof value.median === 'number' && typeof value.q1 === 'number' && typeof value.q3 === 'number') {
		// sounds good, check for helper
		if (typeof value.whiskerMin === 'undefined') {
			const {whiskerMin, whiskerMax} = whiskers(value);
			value.whiskerMin = whiskerMin;
			value.whiskerMax = whiskerMax;
		}
		return value;
	}
	if (!Array.isArray(value)) {
		return undefined;
	}
	if (value.__stats === undefined) {
		value.__stats = boxplotStats(value);
	}
	return value.__stats;
}

export function getRightValue(rawValue) {
	if (!rawValue) {
		return rawValue;
	}
	if (typeof rawValue === 'number' || typeof rawValue === 'string') {
		return Number(rawValue);
	}
	const b = asBoxPlotStats(rawValue);
	return b ? b.median : rawValue;
}

export function commonDataLimits(extraCallback) {
	const chart = this.chart;
	const isHorizontal = this.isHorizontal();

	const matchID = (meta) => isHorizontal ? meta.xAxisID === this.id : meta.yAxisID === this.id;

	// First Calculate the range
	this.min = null;
	this.max = null;

	// Regular charts use x, y values
	// For the boxplot chart we have rawValue.min and rawValue.max for each point
	chart.data.datasets.forEach((d, i) => {
		const meta = chart.getDatasetMeta(i);
		if (!chart.isDatasetVisible(i) || !matchID(meta)) {
			return;
		}
		d.data.forEach((value, j) => {
			if (!value || meta.data[j].hidden) {
				return;
			}
			const boxPlot = asBoxPlotStats(value);
			if (!boxPlot) {
				return;
			}
			if (this.min === null) {
				this.min = boxPlot.min;
			} else if (boxPlot.min < this.min) {
				this.min = boxPlot.min;
			}

			if (this.max === null) {
				this.max = boxPlot.max;
			} else if (boxPlot.max > this.max) {
				this.max = boxPlot.max;
			}

			if (extraCallback) {
				extraCallback(boxPlot);
			}
		});
	});
}

export function rnd(seed) {
	// Adapted from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
	if (seed === undefined) {
		seed = Date.now()
	}
	return () => {
		seed = (seed * 9301 + 49297) % 233280;
		return seed / 233280;
	}
}