// Injected before game modules; uses the existing production debug-camera hook.
export function installSampleView() {
  let camera: typeof window.__debugCam;
  const observations = {
    pose: { position: [770, 10, 110], look: [850, 0, 90] },
    appliedAt: null as number | null,
    signals: [] as {
      t: number;
      hidden: boolean;
      focused: boolean;
      x: number;
      y: number;
      width: number;
      height: number;
    }[],
    occlusion: 'Unknown: focus, visibility and window bounds do not prove physical screen exposure.',
  };
  Object.defineProperty(window, '__debugCam', {
    configurable: true,
    get: () => camera,
    set: (api: typeof window.__debugCam) => {
      camera = api;
      api!.set([770, 10, 110], [850, 0, 90]);
      observations.appliedAt = performance.now();
    },
  });
  const sample = () =>
    observations.signals.push({
      t: performance.now(),
      hidden: document.hidden,
      focused: document.hasFocus(),
      x: screenX,
      y: screenY,
      width: outerWidth,
      height: outerHeight,
    });
  sample();
  const timer = setInterval(sample, 1000);
  Object.assign(window, {
    __coldView: {
      stop: () => {
        clearInterval(timer);
        sample();
        return observations;
      },
    },
  });
}

declare global {
  interface Window {
    __coldView?: {
      stop: () => {
        pose: unknown;
        appliedAt: number | null;
        signals: { hidden: boolean; focused: boolean }[];
        occlusion: string;
      };
    };
  }
}
