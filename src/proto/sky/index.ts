// Parked cloud experiment; the retired sea horizon seam is archived with the old sea.
import { onStart } from '../../loop.ts';
import { createSkyClouds } from './clouds.ts';
onStart(createSkyClouds);
