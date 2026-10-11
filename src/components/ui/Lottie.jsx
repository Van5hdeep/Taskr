import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";
import wasmUrl from "@lottiefiles/dotlottie-web/dotlottie-player.wasm?url";

// Serve the player engine from our own bundle rather than a CDN.
setWasmUrl(wasmUrl);

/** A LottieFiles animation (.lottie or .json URL). */
export default function Lottie({ src, loop = false, autoplay = true, className = "", label }) {
  return (
    <div className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <DotLottieReact src={src} loop={loop} autoplay={autoplay} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
