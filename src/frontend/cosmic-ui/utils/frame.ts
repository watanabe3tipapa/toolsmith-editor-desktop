export type Paths = {
  name?: string;
  show?: boolean;
  style: {
    strokeWidth: string;
    stroke: string;
    fill: string;
  };
  path: (["M", string, string] | ["L", string, string])[];
};

function evalExpression({
  expr,
  width,
  height,
}: {
  expr: string;
  width: number;
  height: number;
}) {
  const replaced = expr
    .replace(/([\d.]+)%/g, (_, num) => {
      const val = parseFloat(num);
      return `(${val} / 100)`;
    })
    .replace(/width/g, width.toString())
    .replace(/height/g, height.toString())
    .replace(/100/g, "100");

  try {
    return Function(`"use strict"; return (${replaced});`)();
  } catch {
    return 0;
  }
}

function createSvgPaths({
  paths,
  width,
  height,
}: {
  paths: Paths;
  width: number;
  height: number;
}) {
  return paths.map((path) => {
    return {
      ...path,
      path: path.path
        .map(([cmd, x, y]) => {
          const parsedX =
            x.includes("%") || x.match(/[+\-*/]/)
              ? evalExpression({
                  expr: x.replace(/%/g, "* width / 100"),
                  width,
                  height,
                })
              : x;
          const parsedY =
            y.includes("%") || y.match(/[+\-*/]/)
              ? evalExpression({
                  expr: y.replace(/%/g, "* height / 100"),
                  width,
                  height,
                })
              : y;

          const numX =
            typeof parsedX === "string" ? parseFloat(parsedX) : parsedX;
          const numY =
            typeof parsedY === "string" ? parseFloat(parsedY) : parsedY;

          return `${cmd} ${parseInt(numX)},${parseInt(numY)}`;
        })
        .join(" "),
    };
  });
}

function findRelativeParent(
  element: HTMLElement | SVGSVGElement | null
): HTMLElement | null {
  if (!element || !element.parentElement) return null;

  const parent = element.parentElement;
  const animationName = window.getComputedStyle(parent).animationName;
  const transitionProperty = window.getComputedStyle(parent).transitionProperty;

  if (
    animationName !== "none" ||
    (transitionProperty !== "all" && transitionProperty !== "none")
  ) {
    return parent;
  }

  return findRelativeParent(parent);
}

function createSvgElement({
  el,
  paths,
  width,
  height,
  enableBackdropBlur,
  enableViewBox,
}: {
  el: SVGSVGElement;
  paths: Paths;
  width: number;
  height: number;
  enableBackdropBlur: boolean;
  enableViewBox: boolean;
}) {
  const prevWidth = el.getAttribute("data-width");
  const prevHeight = el.getAttribute("data-height");

  if (prevWidth != width.toString() || prevHeight != height.toString()) {
    el.setAttribute("data-width", width.toString());
    el.setAttribute("data-height", height.toString());

    el.querySelectorAll("path").forEach((path) => path.remove());

    if (enableViewBox) {
      el.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    createSvgPaths({
      paths,
      width,
      height,
    }).map((p) => {
      const pathElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      pathElement.setAttribute("d", p.path);
      pathElement.style.fill = p.style.fill;
      pathElement.style.stroke = p.style.stroke;
      pathElement.style.strokeWidth = p.style.strokeWidth;
      pathElement.style.vectorEffect = "non-scaling-stroke";
      pathElement.style.shapeRendering = "geometricPrecision";

      el && el.appendChild(pathElement);
    });

    if (enableBackdropBlur) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(el);
      const encoded = encodeURIComponent(svgString);
      const dataUri = `data:image/svg+xml,${encoded}`;

      let divMask = document.createElement("div");

      if (
        el.nextElementSibling?.hasAttribute("data-backdrop") &&
        el.nextElementSibling instanceof HTMLDivElement
      ) {
        divMask = el.nextElementSibling;
      } else {
        divMask.style.opacity = "0";
      }

      divMask.style.willChange = "backdrop-blur";
      divMask.style.transition = "opacity 0.8s ease";
      divMask.style.maskImage = `url("${dataUri}")`;
      divMask.style.maskRepeat = "no-repeat";
      divMask.style.maskSize = "contain";
      divMask.style.zIndex = "-1";
      divMask.style.backdropFilter = "blur(10px)";
      divMask.setAttribute("data-backdrop", "true");
      divMask.setAttribute("class", el.getAttribute("class") ?? "");
      el.parentNode?.insertBefore(divMask, el.nextSibling);

      setTimeout(() => {
        divMask.style.opacity = "1";
      }, 0);
    }
  }
}

function setupSvgRenderer({
  el,
  paths,
  enableBackdropBlur = false,
  enableViewBox = false,
}: {
  el: SVGSVGElement & {
    render?: () => void;
  };
  paths: Paths;
  enableBackdropBlur?: boolean;
  enableViewBox?: boolean;
}) {
  const parentElement = findRelativeParent(el) ?? el;
  const parentWidth = () =>
    parentElement?.getBoundingClientRect().width.toString();
  const parentHeight = () =>
    parentElement?.getBoundingClientRect().height.toString();

  const render = () => {
    const width = el.getBoundingClientRect().width;
    const height = el.getBoundingClientRect().height;

    createSvgElement({
      el,
      paths,
      width,
      height,
      enableBackdropBlur,
      enableViewBox,
    });
  };

  el.render = render;

  const observer = new ResizeObserver((entries) => {
    for (let entry of entries) {
      entry;
      render();
    }
  });

  observer.observe(el);

  parentElement.addEventListener("transitionstart", () => {
    let running = true;

    function loop() {
      if (!running) return;
      render();

      requestAnimationFrame(loop);
    }

    loop();

    parentElement.addEventListener(
      "transitionend",
      () => {
        if (
          parentWidth().toString() == el.getAttribute("data-width") &&
          parentHeight().toString() == el.getAttribute("data-height")
        ) {
          running = false;
        }
      },
      { once: true }
    );
  });

  parentElement.addEventListener("animationstart", () => {
    let running = true;

    function loop() {
      if (!running) return;
      render();

      requestAnimationFrame(loop);
    }

    loop();

    parentElement.addEventListener(
      "animationend",
      () => {
        if (
          parentWidth().toString() == el.getAttribute("data-width") &&
          parentHeight().toString() == el.getAttribute("data-height")
        ) {
          running = false;
        }
      },
      { once: true }
    );
  });

  return {
    destroy: () => observer.disconnect(),
  };
}

export { setupSvgRenderer };
